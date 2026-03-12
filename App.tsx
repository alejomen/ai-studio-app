import React, { useMemo, useState } from 'react';

type OperationType = 'Bv' | 'Bh' | 'Bg' | 'CutX' | 'CutY' | 'Rout' | 'Pock' | 'Unknown';

interface ParsedOperation {
  id: string;
  type: OperationType;
  rawLine: string;
  params: Record<string, number | string>;
}

interface NormalizedProgram {
  panel: { x: number; y: number; z: number };
  operations: ParsedOperation[];
  unsupported: ParsedOperation[];
}

const DEFAULT_MAPPINGS: Record<Exclude<OperationType, 'Unknown'>, string> = {
  Bv: 'WW_DrillVertical',
  Bh: 'WW_DrillHorizontal',
  Bg: 'WW_DrillGeneric',
  CutX: 'WW_GrooveX',
  CutY: 'WW_GrooveY',
  Rout: 'WW_Route2D',
  Pock: 'WW_Pocket'
};

const EXAMPLE_BPP = `PAN=720
LARG=480
ESP=15
BV(X=32,Y=50,DP=12,DIA=5)
BH(X=700,Y=240,Z=7.5,DP=30,DIA=8)
BG(X=200,Y=200,AZ=45,DP=10,DIA=5)
CUT_X(Y=20,X0=0,X1=720,DP=4)
ROUT(X=10,Y=10,X1=710,Y1=470,DP=2)
POCK(X=50,Y=80,L=120,W=60,DP=4)`;

const MACHINING_PREFIXES = ['BV', 'BH', 'BG', 'CUT_X', 'CUTY', 'CUT_Y', 'CUTX', 'ROUT', 'POCK'];

const parseNumber = (value: string): number | string => {
  const n = Number(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : value.trim();
};

const extractParams = (line: string): Record<string, number | string> => {
  const params: Record<string, number | string> = {};
  const keyValueRegex = /([A-Za-z][A-Za-z0-9_]*)\s*=\s*([^,;\]\)]+)/g;
  let match: RegExpExecArray | null = null;

  while ((match = keyValueRegex.exec(line)) !== null) {
    params[match[1].toUpperCase()] = parseNumber(match[2]);
  }

  if (Object.keys(params).length > 0) return params;

  const argsMatch = line.match(/\(([^)]*)\)/);
  if (!argsMatch) return params;

  argsMatch[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((value, index) => {
      params[`ARG${index + 1}`] = parseNumber(value);
    });

  return params;
};

const detectType = (line: string): OperationType => {
  const normalized = line.toUpperCase();
  if (/\bBV\b/.test(normalized)) return 'Bv';
  if (/\bBH\b/.test(normalized)) return 'Bh';
  if (/\bBG\b/.test(normalized)) return 'Bg';
  if (normalized.includes('CUT_X') || normalized.includes('CUTX')) return 'CutX';
  if (normalized.includes('CUT_Y') || normalized.includes('CUTY')) return 'CutY';
  if (normalized.includes('ROUT')) return 'Rout';
  if (normalized.includes('POCK')) return 'Pock';
  return 'Unknown';
};

const normalizeInputLines = (source: string): string[] =>
  source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith(';'));

const getPanelValue = (source: string, keys: string[]): number => {
  for (const key of keys) {
    const byEquals = source.match(new RegExp(`${key}\\s*=\\s*(-?\\d+(?:[\\.,]\\d+)?)`, 'i'));
    if (byEquals?.[1]) return Number(byEquals[1].replace(',', '.'));

    const byBracket = source.match(new RegExp(`${key}\\s*\\[\\s*(-?\\d+(?:[\\.,]\\d+)?)\\s*\\]`, 'i'));
    if (byBracket?.[1]) return Number(byBracket[1].replace(',', '.'));
  }
  return 0;
};

const parseBpp = (source: string): NormalizedProgram => {
  const lines = normalizeInputLines(source);
  const panel = {
    x: getPanelValue(source, ['PAN', 'LPX', 'DIMX']),
    y: getPanelValue(source, ['LARG', 'LPY', 'DIMY']),
    z: getPanelValue(source, ['ESP', 'LPZ', 'DIMZ'])
  };

  const operationLines = lines.filter((line) => {
    const upper = line.toUpperCase();
    return MACHINING_PREFIXES.some((prefix) => upper.includes(prefix));
  });

  const operations: ParsedOperation[] = operationLines.map((line, index) => ({
    id: `op-${index + 1}`,
    type: detectType(line),
    rawLine: line,
    params: extractParams(line)
  }));

  const unsupported = operations.filter((op) => op.type === 'Unknown');
  return { panel, operations, unsupported };
};

const formatParams = (params: Record<string, number | string>): string =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

const buildMpr = (program: NormalizedProgram, mappings: Record<Exclude<OperationType, 'Unknown'>, string>): string => {
  const header = ['[H]', `PAN=${program.panel.x}`, `LARG=${program.panel.y}`, `ESP=${program.panel.z}`, "MACHINE='BHX50'", ''];

  const body = program.operations
    .filter((op): op is ParsedOperation & { type: Exclude<OperationType, 'Unknown'> } => op.type !== 'Unknown')
    .map((op, index) => {
      const macro = mappings[op.type] || 'UNMAPPED';
      return [`[OP${index + 1}]`, `TYPE=${macro}`, formatParams(op.params) || 'ARGS=', `SRC=${op.rawLine}`, ''].join('\n');
    });

  return [...header, ...body, '[END]'].join('\n');
};

const card: React.CSSProperties = { border: '1px solid #d4d4d8', borderRadius: 12, padding: 16, background: '#fff' };

const App: React.FC = () => {
  const [rawBpp, setRawBpp] = useState('');
  const [fileName, setFileName] = useState('');
  const [mappings, setMappings] = useState(DEFAULT_MAPPINGS);

  const parsed = useMemo(() => parseBpp(rawBpp), [rawBpp]);
  const generatedMpr = useMemo(() => buildMpr(parsed, mappings), [parsed, mappings]);

  const status = useMemo(() => {
    if (!rawBpp.trim()) return 'Pegá/cargá un .bpp para empezar.';
    if (parsed.operations.length === 0) return 'No se detectaron operaciones del set MVP (BV/BH/BG/CUT/ROUT/POCK).';
    return `OK: ${parsed.operations.length} operaciones detectadas (${parsed.unsupported.length} sin mapping).`;
  }, [rawBpp, parsed]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setRawBpp(text);
    setFileName(file.name);
  };

  const exportMpr = () => {
    if (!rawBpp.trim()) return;
    const blob = new Blob([generatedMpr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.bpp$/i, '') || 'pieza'}_bhx50.mpr`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#f4f4f5', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header style={{ ...card, background: '#18181b', color: '#fafafa' }}>
          <h1 style={{ margin: 0 }}>Conversor BPP → MPR (BHX50)</h1>
          <p style={{ margin: '8px 0 0 0' }}>Esta app es interactiva: se actualiza en vivo al pegar o cargar un BPP.</p>
        </header>

        <section style={{ ...card, background: '#eff6ff', borderColor: '#93c5fd' }}>
          <h2 style={{ marginTop: 0 }}>¿Dónde probarla?</h2>
          <ol style={{ marginBottom: 0 }}>
            <li>En la carpeta del proyecto: <code>npm install</code></li>
            <li>Ejecutar: <code>npm run dev</code></li>
            <li>Abrir: <code>http://localhost:5173</code> (o la URL que te muestre Vite)</li>
          </ol>
        </section>

        <section style={card}>
          <h2>1) Entrada BPP</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <input type="file" accept=".bpp,.txt" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            <button onClick={() => { setRawBpp(EXAMPLE_BPP); setFileName('ejemplo.bpp'); }}>Cargar ejemplo</button>
            <button onClick={() => setMappings(DEFAULT_MAPPINGS)}>Restaurar mappings</button>
            <button onClick={() => { setRawBpp(''); setFileName(''); }}>Limpiar</button>
          </div>
          <p><strong>Archivo:</strong> {fileName || 'sin seleccionar'}</p>
          <p><strong>Estado:</strong> {status}</p>
          <textarea
            value={rawBpp}
            onChange={(e) => setRawBpp(e.target.value)}
            rows={11}
            style={{ width: '100%', fontFamily: 'monospace', borderRadius: 8, border: '1px solid #d4d4d8', padding: 12 }}
            placeholder="Pegá aquí el contenido .bpp"
          />
        </section>

        <section style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h2>2) Resultado parser/normalización</h2>
            <p><strong>Panel:</strong> X={parsed.panel.x} | Y={parsed.panel.y} | Z={parsed.panel.z}</p>
            <p><strong>Operaciones:</strong> {parsed.operations.length}</p>
            <ul>
              {parsed.operations.map((op) => (
                <li key={op.id}>
                  <strong>{op.type}</strong> — {Object.keys(op.params).length > 0 ? Object.keys(op.params).join(', ') : 'sin parámetros'}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2>3) Diccionario BHX50</h2>
            {(Object.keys(mappings) as Array<Exclude<OperationType, 'Unknown'>>).map((key) => (
              <label key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <span style={{ width: 60 }}>{key}</span>
                <input
                  value={mappings[key]}
                  onChange={(e) => setMappings((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={{ flex: 1, border: '1px solid #d4d4d8', borderRadius: 6, padding: '4px 8px' }}
                />
              </label>
            ))}
          </div>
        </section>

        <section style={card}>
          <h2>4) Preview y exportación .mpr</h2>
          <button
            onClick={exportMpr}
            disabled={!rawBpp.trim()}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: !rawBpp.trim() ? '#9ca3af' : '#2563eb',
              color: '#fff',
              cursor: !rawBpp.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            Exportar .mpr
          </button>
          <pre style={{ marginTop: 12, background: '#09090b', color: '#f4f4f5', padding: 12, borderRadius: 10, overflowX: 'auto' }}>{generatedMpr}</pre>
        </section>
      </div>
    </main>
  );
};

export default App;
