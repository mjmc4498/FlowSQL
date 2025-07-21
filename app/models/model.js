function analizarSQL(sql) {
  // Eliminar comentarios y sentencias no relevantes
  const cleanedSql = sql
    .replace(/--.*$/gm, '') // Eliminar comentarios de una sola línea
    .replace(/\/\*[\s\S]*?\*\//g, '') // Eliminar comentarios de varias líneas
    .replace(/SET [^;]+;/g, '') // Eliminar sentencias SET
    .replace(/WHENEVER [^;]+;/g, '') // Eliminar sentencias WHENEVER
    .replace(/COMMIT;/g, '') // Eliminar sentencias COMMIT
    .replace(/ANALYZE TABLE [^;]+;/g, '') // Eliminar sentencias ANALYZE
    .replace(/TRUNCATE TABLE [^;]+;/g, '') // Eliminar sentencias TRUNCATE
    .replace(/DROP TABLE [^;]+;/g, '') // Eliminar sentencias DROP
    .replace(/CREATE TABLE [^;]+;/g, '') // Eliminar sentencias CREATE
    .replace(/DELETE FROM [^;]+;/g, '') // Eliminar sentencias DELETE
    .trim();

  const statements = cleanedSql.split(';').filter(s => s.trim() !== '');

  let allResultados = [];
  let allRelaciones = new Set();

  statements.forEach(statement => {
    const insertRegex = /insert\s+(?:\/\*.*?\*\/)?\s*into\s+([\w\.]+)\s*\(([^)]+)\)[\s\S]*?select\s+([\s\S]+?)\s+from\s+([\s\S]+)/i;
    const match = statement.match(insertRegex);

    if (match) {
      const tablaDestino = match[1].trim();
      const camposDestino = match[2].split(',').map(s => s.trim());
      const camposFuenteStr = match[3];
      const fromClause = match[4];

      const { tablasFuente, alias } = parseFromClause(fromClause);
      const camposFuente = parseSelectClause(camposFuenteStr, alias);

      for (let i = 0; i < camposDestino.length; i++) {
        const campoDestino = camposDestino[i];
        const campoFuente = camposFuente[i] || { expr: 'N/A', tabla: 'N/A' };

        allResultados.push({
          tablaFuente: campoFuente.tabla,
          campoFuente: campoFuente.expr,
          tablaDestino: tablaDestino,
          campoDestino: campoDestino,
          logica: campoFuente.expr.includes('case') ? 'CASE' : '-',
        });
      }

      tablasFuente.forEach(tabla => {
        allRelaciones.add(`${tabla}-->${tablaDestino}`);
      });
    }
  });

  if (allResultados.length > 0) {
    return {
      resultados: allResultados,
      relaciones: 'graph TD\n' + [...allRelaciones].join('\n'),
    };
  } else {
    return null;
  }
}

function parseFromClause(fromClause) {
  const tablasFuente = [];
  const alias = {};
  const joinRegex = /([\w\.]+)\s+(\w+)/g;
  let match;
  while ((match = joinRegex.exec(fromClause)) !== null) {
    const tabla = match[1].trim();
    const al = match[2].trim();
    tablasFuente.push(tabla);
    alias[al] = tabla;
  }

  // Si no hay joins, solo hay una tabla
  if (tablasFuente.length === 0) {
    tablasFuente.push(fromClause.trim().split(' ')[0]);
  }

  return { tablasFuente, alias };
}

function parseSelectClause(selectClause, alias) {
    const campos = selectClause.split(/,(?![^()]*\))/); // Split by comma, ignoring commas inside parentheses

    return campos.map(campo => {
        campo = campo.trim();
        const asMatch = campo.match(/\s+as\s+([\w\d_]+)/i);
        const expr = asMatch ? campo.substring(0, asMatch.index).trim() : campo;

        const tableMatch = expr.match(/^(\w+)\./);
        let tabla = 'N/A';
        if (tableMatch) {
            const aliasName = tableMatch[1];
            tabla = alias[aliasName] || aliasName;
        }

        return {
            expr: expr,
            tabla: tabla,
            alias: asMatch ? asMatch[1] : null
        };
    });
}
