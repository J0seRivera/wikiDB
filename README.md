# Wiki de Bases de Datos

SPA educativa que funciona como guía interactiva para aprender conceptos fundamentales de bases de datos: fundamentos, modelos, arquitectura y SQL, con un simulador de consultas en memoria.

## Tecnologías

- HTML5 semántico
- CSS3 (Grid/Flexbox, variables CSS, media queries)
- TypeScript
- Vite

Sin frameworks, sin backend y sin dependencias adicionales.

## Arquitectura

```text
JSON (contenido)
   ↓
TypeScript (lógica y componentes)
   ↓
Renderizado dinámico
   ↓
HTML
```

## Scripts

```bash
npm install     # instalar dependencias
npm run dev     # servidor de desarrollo
npm run build   # verificación de tipos + build de producción
npm run preview # servir el build de producción
```

## Estructura

```text
├── index.html                  Estructura base de la aplicación
└── src/
    ├── main.ts                 Punto de entrada: carga datos e inicializa la app
    ├── types.ts                Tipos e interfaces del contenido
    ├── data/
    │   └── database-concepts.json   Contenido educativo estático
    ├── components/
    │   ├── navigation.ts       Navegación SPA (hash routing)
    │   ├── content.ts          Renderizado de secciones y bloques
    │   ├── diagrams.ts         Diagramas educativos (HTML/CSS)
    │   └── simulatorUI.ts      Interfaz del simulador SQL
    ├── simulator/
    │   ├── types.ts            Tipos del simulador (tablas, consultas, resultados)
    │   ├── database.ts         Base de datos en memoria (tabla usuarios)
    │   ├── parser.ts           Parser de consultas SQL
    │   └── executor.ts         Ejecución de consultas sobre los datos
    └── styles/
        ├── main.css            Variables y estilos base
        ├── layout.css          Estructura general y responsive
        ├── components.css      Componentes de contenido
        ├── simulator.css       Estilos del simulador
        └── diagrams.css        Estilos de los diagramas
```
