document.addEventListener('DOMContentLoaded', function() {
  mermaid.initialize({ startOnLoad: true });

  document.getElementById('sqlFile').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function() {
      document.getElementById('sqlInput').value = reader.result;
    }
    reader.readAsText(e.target.files[0]);
  });

  document.getElementById('analizarBtn').addEventListener('click', function() {
    const sql = document.getElementById('sqlInput').value.toLowerCase();
    const resultadoBody = document.getElementById('resultadoBody');
    resultadoBody.innerHTML = '';

    const analisis = analizarSQL(sql);

    if (analisis) {
      analisis.resultados.forEach(res => {
        resultadoBody.innerHTML += `
          <tr>
            <td>${res.tablaFuente}</td>
            <td>${res.campoFuente}</td>
            <td>${res.tablaDestino}</td>
            <td>${res.campoDestino}</td>
            <td>${res.logica}</td>
          </tr>
        `;
      });

      document.getElementById('resultado').style.display = 'table';
      const graphDiv = document.getElementById('graphDiv');
      graphDiv.innerHTML = analisis.relaciones;
      // No es necesario llamar a mermaid.contentLoaded() si startOnLoad es true
      // y el contenido se añade antes de que se cargue la página.
      // Si el contenido se añade dinámicamente, puede que necesitemos
      // renderizar el diagrama explícitamente.
       mermaid.init(undefined, graphDiv);


    } else {
      alert('Soporta formato INSERT INTO ... SELECT ... FROM ... por ahora.');
    }
  });
});
