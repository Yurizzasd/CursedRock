// Utilitários de pacote Bedrock (.mcaddon/.mcpack/.mctemplate) — compartilhados
// entre o worker de importação (mcpedl-process.mjs) e scripts de migração/auditoria.
import { inflateRawSync } from 'node:zlib';

// leitor ZIP pelo central directory (confiável mesmo com data descriptors)
// 2026 fix (lote 1): offsets corretos do CD (nameLen=p+28, lho=p+42, nome em p+46)
// e o 1º arquivo com offset local 0 NÃO é pulado.
export function zipScan(buf) {
  let i = buf.length - 22;
  while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
  if (i < 0) throw new Error('ZIP sem fim de central directory');
  const count = buf.readUInt16LE(i + 10);
  let p = buf.readUInt32LE(i + 16);
  const entries = [];
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commLen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    p += 46 + nameLen + extraLen + commLen;
    entries.push({ name, method, csize, lho });
  }
  return entries;
}

export function zipReadEntry(buf, e) {
  const nameLen = buf.readUInt16LE(e.lho + 26);
  const extraLen = buf.readUInt16LE(e.lho + 28);
  const dataStart = e.lho + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + e.csize);
  return e.method === 0 ? raw : inflateRawSync(raw);
}

// parser de manifest: tolera BOM e comentários `//`/`/* */` — o próprio Bedrock
// aceita manifest.json com comentários (padrão em packs feitos no bridge.editor),
// então o validador não pode rejeitar por JSON.parse puro.
// Regex linear e sem quantificadores aninhados (regra de segurança do projeto).
export function parseManifestJson(bytes) {
  const txt = bytes.toString('utf8').replace(/^\uFEFF/, '');
  try {
    return JSON.parse(txt);
  } catch {
    // comentários // e /* */ fora de strings (padrão bridge.editor)
    let resto;
    try {
      resto = txt.replace(/("([^"\\]|\\.)*")|\/\/[^\n]*|\/\*([^*]|[*](?!\/))*[*]\/\s*/g, '$1');
    } catch {
      resto = txt;
    }
    try {
      return JSON.parse(resto);
    } catch {
    try {
      // zero à esquerda tipo "version": [4, 07, 19] — inválido pro JSON.parse,
      // aceito pelo parser do Bedrock (Dungeons Content, lote 4).
      // V8 passa named groups como args POSICIONAIS: a[1]=sign, a[2]=num (no
      // caminho do número) e undefined no caminho de strings — o objeto `groups`
      // não é confiável (vem {} pra strings). Discriminador: a[2] definido.
      return JSON.parse(
        resto.replace(
          /(?:"(?:[^"\\]|\\.)*")|(?<sign>-?)(?<num>0(?:[0-9]+)?(?:\.[0-9]+)?)(?=\s*[,}\]])/g,
          (...a) => (a[2] !== undefined ? `${a[1] ?? ''}${String(Number(a[2]))}` : a[0]),
        ),
      );
    } catch {
      return undefined;
    }
    }
  }
}

// valida pacote e extrai manifest (BP/RP) → uuid, versão, min_engine
// - manifest.json OU pack_manifest.json (alias antigo), em qualquer pasta
// - artefatos aninhados: .mcpack (packs), .mcworld/.mctemplate (mundos, exigem
//   level.dat/levelname.txt) — o Bedrock importa todos os formatos
// - aceitarLegado: manifest pré-1.13 (pack_id/packs_version, sem header) é
//   hospedável — o Bedrock importa e converte (regra "sempre TeraBox", lote 4).
//   Mas manifest ESTILO novo SEM header.uuid continua reprovado: o jogo
//   rejeita, e o selo "Verificado" não mente.
// - exigirUuid=false (só variantes/migrador): além do legado, aceita mundos
//   aninhados (bundle sem manifest raíz).
export function validarPacote(buf, { exigirUuid = true, aceitarLegado = false } = {}) {
  const entries = zipScan(buf);
  const manifests = [];
  for (const e of entries.filter((x) => /(?:pack_)?manifest\.json$/i.test(x.name))) {
    const m = parseManifestJson(zipReadEntry(buf, e));
    if (m) manifests.push(m);
  }
  // 2026 fix (lote 2): .mcaddon-casulo — packs .mcpack ANINHADOS sem manifest
  // na raíz (ex. Farming Mod). 2026 fix (lote 4): também .mcworld/.mctemplate
  // aninhados (Dungeons Content: 3 .mcpack dentro da .mcaddon).
  if (manifests.length === 0) {
    const aninhados = entries.filter((x) => /\.(?:mcpack|mcworld|mctemplate)$/i.test(x.name));
    for (const e of aninhados) {
      try {
        const inner = zipReadEntry(buf, e);
        const innerEntries = zipScan(inner);
        for (const m of innerEntries.filter((i) => /(?:pack_)?manifest\.json$/i.test(i.name))) {
          const parsed = parseManifestJson(zipReadEntry(inner, m));
          if (parsed) manifests.push(parsed);
        }
        if (manifests.length === 0) {
          const eMundo = innerEntries.find((i) => /level\.dat$|levelname\.txt$/i.test(i.name));
          if (eMundo) {
            manifests.push({ header: { name: e.name.replace(/\.[^.]+$/, '') }, mundo: true });
          }
        }
      } catch { /* artefato interno quebrado — ignora */ }
    }
  }
  // formatos modernos: uuid é obrigatório em TODOS os modos
  const header = manifests.map((m) => m?.header).find((h) => h?.uuid);
  if (!header) {
    // legado pré-1.13: manifest com pack_id, sem header — importável pelo jogo
    const legado = aceitarLegado ? manifests.find((m) => m?.pack_id) : undefined;
    if (legado) {
      return {
        name: String(legado.pack_id),
        version: String(legado.packs_version ?? ''),
        minecraft: '',
        ext: '.mcpack',
        packs: manifests.length,
        legacy: true,
      };
    }
    // bundle Bedrock sem manifest direto mas com mundo aninhado válido
    const mundo = !exigirUuid ? manifests.find((m) => m?.mundo) : undefined;
    if (mundo) {
      return {
        name: String(mundo.header.name ?? 'mundo'),
        version: '',
        minecraft: '',
        ext: '.mcworld',
        packs: 0,
        bundle: true,
      };
    }
  }
  if (!header) {
    throw new Error(manifests.length ? 'manifest.json sem header.uuid' : 'ZIP válido, mas sem manifest.json');
  }
  const isRp = manifests.some((m) => m?.modules?.[0]?.type === 'resources');
  const isBp = manifests.some((m) => m?.modules?.[0]?.type === 'data') || isRp === false;
  const ext = isBp && !isRp ? '.mcpack' : '.mcaddon';
  return {
    name: header.name ?? '',
    version: Array.isArray(header.version) ? header.version.join('.') : String(header.version ?? ''),
    minecraft: Array.isArray(header.min_engine_version) ? header.min_engine_version.join('.') : '',
    ext,
    packs: manifests.length,
  };
}
