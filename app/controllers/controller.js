document.addEventListener('DOMContentLoaded', function() {
  mermaid.initialize({ startOnLoad: true });

  const analizarBtn = document.getElementById('analizarBtn');
  const analizarBtnSpinner = document.getElementById('analizarBtnSpinner');
  const sqlFileInput = document.getElementById('sqlFile');
  const sqlInput = document.getElementById('sqlInput');
  const resultadoBody = document.getElementById('resultadoBody');
  const resultadoTable = document.getElementById('resultado');
  const graphDiv = document.getElementById('graphDiv');

  sqlFileInput.addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function() {
      sqlInput.value = reader.result;
    }
    reader.readAsText(e.target.files[0]);
  });

  analizarBtn.addEventListener('click', function() {
    analizarBtn.disabled = true;
    analizarBtnSpinner.style.display = 'inline-block';
    resultadoBody.innerHTML = '';
    graphDiv.innerHTML = '';

    setTimeout(() => {
      const sql = sqlInput.value.toLowerCase();
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

        resultadoTable.style.display = 'table';
        graphDiv.innerHTML = analisis.relaciones;
        mermaid.init(undefined, graphDiv);
      } else {
        alert('Soporta formato INSERT INTO ... SELECT ... FROM ... por ahora.');
      }

      analizarBtn.disabled = false;
      analizarBtnSpinner.style.display = 'none';
    }, 500); // Simula un retraso para que se vea el spinner
  });
});
