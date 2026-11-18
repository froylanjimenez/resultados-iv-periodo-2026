# Resultados IV periodo 2026

Sitio estático con los resultados de la prueba de periodo (Cuadernillo n.º 1) de los grados 6.° a 10.°.

## Funciones

- **Pestaña «Análisis general»** (6.° a 10.°): promedios por grado, áreas en todos los grados, fortalezas y retos, comparativo de grupos, mejores resultados y CSV consolidado (`#general`).
- **Pestañas por grado** y filtro por **grupo** (el enlace conserva el grado y el grupo, por ejemplo `#grado-6-g2`).
- **Buscador global** de estudiantes en todos los grados (`Ctrl K`).
- Resultados **por área**, **comparativo por grupo**, **tabla de estudiantes** ordenable y **análisis por pregunta**.
- **Descargar CSV** de notas: grado completo, por grupo, por área y grupo puntual (o área en todo el grado) y por estudiante.
  Los CSV usan `;` como separador y coma decimal, listos para Excel en español.
- **Reconocimientos** imprimibles (carta horizontal) para los puestos 1, 2 y 3 de cada grupo, en el total y por área, con la firma del docente que los imprime.
- **Boletín individual** imprimible (carta vertical) desde la ficha de cada estudiante.

## Escala

Escala de 0 a 100: nota = porcentaje de aciertos, redondeado.
Niveles: Bajo 0–59 · Básico 60–79 · Alto 80–89 · Superior 90–100.
Los puestos usan el total de aciertos; los empates comparten puesto. Solo compiten por el puesto general quienes presentaron todas las sesiones.

## Estructura

```
index.html          página
assets/app.css      estilos (pantalla e impresión)
assets/app.js       lógica
assets/config.js    institución, lema, firmas, fecha y escudo de los reconocimientos
data/gN.js          resultados de cada grado (generados)
```

Para cambiar los textos de los reconocimientos o agregar el escudo, edita `assets/config.js`.
