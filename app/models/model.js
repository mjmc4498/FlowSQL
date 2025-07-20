function analizarSQL(sql) {
  const insertRegex = /insert\s+into\s+(\w+)\s*\(([^)]+)\)/i;
  const selectRegex = /select\s+([\s\S]+?)\s+from\s+(\w+)/i;

  const insertMatch = sql.match(insertRegex);
  const selectMatch = sql.match(selectRegex);

  let relaciones = 'graph TD\n';
  let resultados = [];

  if (insertMatch && selectMatch) {
    const tablaDestino = insertMatch[1];
    const camposDestino = insertMatch[2].split(',').map(s => s.trim());
    const camposFuente = selectMatch[1].split(',').map(s => s.trim());
    const tablaFuente = selectMatch[2];

    for (let i = 0; i < camposDestino.length; i++) {
      let logica = '-';
      const campo = camposFuente[i] || '';

      if (/cast|coalesce|case|when/.test(campo)) {
        logica = 'Función: ' + campo.match(/(cast|coalesce|case|when)[\s\S]*?/)[0];
      }

      resultados.push({
        tablaFuente: tablaFuente,
        campoFuente: campo,
        tablaDestino: tablaDestino,
        campoDestino: camposDestino[i],
        logica: logica
      });

      relaciones += `${tablaFuente}-->${tablaDestino}\n`;
    }
    return { resultados, relaciones };
  } else {
    return null;
  }
}
