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
    // Analizar sentencias INSERT
    const insertRegex = /insert\s+(?:\/\*.*?\*\/)?\s*into\s+([\w\.]+)\s*\(([^)]+)\)[\s\S]*?select\s+([\s\S]+?)\s+from\s+([\s\S]+)/i;
    const insertMatch = statement.match(insertRegex);

    if (insertMatch) {
      const tablaDestino = insertMatch[1].trim();
      const camposDestino = insertMatch[2].split(',').map(s => s.trim());
      const camposFuenteStr = insertMatch[3];
      const fromClause = insertMatch[4];
      const whereClause = fromClause.split(/where/i)[1] || '';

      const { tablasFuente, alias } = parseFromClause(fromClause.split(/where/i)[0]);
      const camposFuente = parseSelectClause(camposFuenteStr, alias);

      for (let i = 0; i < camposDestino.length; i++) {
        const campoDestino = camposDestino[i];
        const campoFuente = camposFuente[i] || { expr: 'N/A', tabla: 'N/A' };

        allResultados.push({
          tablaFuente: campoFuente.tabla,
          campoFuente: campoFuente.expr,
          tablaDestino: tablaDestino,
          campoDestino: campoDestino,
          logica: 'INSERT',
        });
      }

      const whereTablas = parseWhereClause(whereClause, alias);
      const todasLasTablas = [...new Set([...tablasFuente, ...whereTablas])];

      todasLasTablas.forEach(tabla => {
        allRelaciones.add(`${tabla}--"INSERT"-->${tablaDestino}`);
      });
    }

    // Analizar sentencias UPDATE
    const updateRegex = /update\s+([\w\.]+)\s+set\s+([\s\S]+?)(?:\s+from\s+([\s\S]+?))?\s+where\s+([\s\S]+)/i;
    const updateMatch = statement.match(updateRegex);

    if (updateMatch) {
      const tablaDestino = updateMatch[1].trim();
      const setClause = updateMatch[2];
      const fromClause = updateMatch[3] || '';

      const { tablasFuente, alias } = parseFromClause(fromClause);

      const setCampos = setClause.split(',').map(s => s.trim());
      setCampos.forEach(campo => {
        const [campoDestino, campoFuenteExpr] = campo.split('=').map(s => s.trim());
        const campoFuente = parseSelectClause(campoFuenteExpr, alias)[0];

        allResultados.push({
            tablaFuente: campoFuente.tabla,
            campoFuente: campoFuente.expr,
            tablaDestino: tablaDestino,
            campoDestino: campoDestino,
            logica: 'UPDATE',
        });
      });

      tablasFuente.forEach(tabla => {
        allRelaciones.add(`${tabla}--"UPDATE"-->${tablaDestino}`);
      });
    }

    // Analizar sentencias DELETE
    const deleteRegex = /delete\s+from\s+([\w\.]+)(?:\s+using\s+([\s\S]+?))?\s+where\s+([\s\S]+)/i;
    const deleteMatch = statement.match(deleteRegex);

    if (deleteMatch) {
        const tablaDestino = deleteMatch[1].trim();
        const fromClause = deleteMatch[2] || '';

        const { tablasFuente, alias } = parseFromClause(fromClause);

        if (tablasFuente.length > 0) {
            tablasFuente.forEach(tabla => {
                allRelaciones.add(`${tabla}--"DELETE"-->${tablaDestino}`);
            });
        } else {
            allRelaciones.add(`DELETE--FROM-->${tablaDestino}`);
        }
    }

    // Analizar sentencias MERGE
    const mergeRegex = /merge\s+into\s+([\w\.]+)\s+using\s+([\w\.]+)\s+on\s+([\s\S]+?)\s+(when\s+matched\s+then\s+update\s+set\s+[\s\S]+?)?\s*(when\s+not\s+matched\s+then\s+insert\s+[\s\S]+)?/i;
    const mergeMatch = statement.match(mergeRegex);

    if (mergeMatch) {
        const tablaDestino = mergeMatch[1].trim();
        const tablaFuente = mergeMatch[2].trim();
        const updateClause = mergeMatch[4] || '';
        const insertClause = mergeMatch[5] || '';

        if (updateClause) {
            allRelaciones.add(`${tablaFuente}--"UPDATE"-->${tablaDestino}`);
        }
        if (insertClause) {
            allRelaciones.add(`${tablaFuente}--"INSERT"-->${tablaDestino}`);
        }
    }

    // Analizar sentencias CREATE TABLE
    const createTableRegex = /create\s+(?:temporary\s+)?table\s+([\w\.]+)\s*\(([\s\S]+)\)/i;
    const createTableMatch = statement.match(createTableRegex);

    if (createTableMatch) {
      const tableName = createTableMatch[1].trim();
      const columnsDef = createTableMatch[2].trim();
      const foreignKeyRegex = /foreign\s+key\s*\(([\w\d_]+)\)\s+references\s+([\w\d_]+)\s*\(([\w\d_]+)\)/gi;
      let fkMatch;
      while ((fkMatch = foreignKeyRegex.exec(columnsDef)) !== null) {
        const fromTable = tableName;
        const toTable = fkMatch[2];
        allRelaciones.add(`${fromTable}-->${toTable}`);
      }
    }
  });

  if (allResultados.length > 0 || allRelaciones.size > 0) {
    return {
      resultados: allResultados,
      relaciones: 'graph TD\n' + [...allRelaciones].join('\n'),
    };
  } else {
    return null;
  }
}

function parseFromClause(fromClause) {
  const tablasFuente = new Set();
  const alias = {};
  // Expresión regular mejorada para capturar varios tipos de JOINs y tablas con alias
  const fromRegex = /(?:from|join)\s+([\w\.]+)(?:\s+as)?\s+(\w+)?/gi;
  let match;

  while ((match = fromRegex.exec(fromClause)) !== null) {
    const tabla = match[1].trim();
    const al = match[2] ? match[2].trim() : tabla;
    tablasFuente.add(tabla);
    alias[al] = tabla;
  }

  // Si no se encontraron coincidencias con la expresión regular, puede ser una sola tabla sin alias
  if (tablasFuente.size === 0 && fromClause.trim()) {
      const parts = fromClause.trim().split(/\s+/);
      const tableName = parts[0];
      tablasFuente.add(tableName);
      alias[tableName] = tableName; // Asume que el nombre de la tabla es su propio alias si no se especifica
  }


  return { tablasFuente: [...tablasFuente], alias };
}

function parseSelectClause(selectClause, alias) {
    const campos = selectClause.split(/,(?![^()]*\))/); // Split by comma, ignoring commas inside parentheses

    return campos.map(campo => {
        campo = campo.trim();
        const asMatch = campo.match(/\s+as\s+([\w\d_]+)/i);
        let expr = asMatch ? campo.substring(0, asMatch.index).trim() : campo;

        // Extraer la tabla de origen de funciones como COALESCE, CAST, etc.
        const funcMatch = expr.match(/(?:coalesce|cast|case\s+when\s+[\s\S]+?then\s+([\w\.]+)|'[^']*'|[\w\.]+)/i);
        let innerExpr = expr;
        if (funcMatch) {
            // Simplificamos: tomamos la primera coincidencia de tabla.columna dentro de la función
            const innerContentMatch = expr.match(/([\w\d_]+)\.[\w\d_]+/);
            if(innerContentMatch) {
                innerExpr = innerContentMatch[0];
            }
        }

        const tableMatch = innerExpr.match(/^(\w+)\./);
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

function parseWhereClause(whereClause, alias) {
    const tablasFuente = new Set();
    const subqueryRegex = /from\s+([\w\.]+)(?:\s+as)?\s+(\w+)?/gi;
    let match;

    while ((match = subqueryRegex.exec(whereClause)) !== null) {
        const tabla = match[1].trim();
        tablasFuente.add(tabla);
    }

    return [...tablasFuente];
}
