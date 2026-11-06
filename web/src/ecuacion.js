// Marcas para escribir ecuaciones dentro del texto de data-tip (un atributo solo guarda texto).
// El globo de información (components/tip.jsx) las dibuja con fracciones y raíces.
export const fr = (num, den) => `⟦f⟧${num}⟦|⟧${den}⟦.⟧`   // fracción
export const rz = (x) => `⟦r⟧${x}⟦.⟧`                     // raíz cuadrada
export const sb = (x) => `⟦s⟧${x}⟦.⟧`                     // subíndice
export const tit = (t) => `⟦t⟧${t}`                       // título de un bloque del desarrollo
// una ecuación paso a paso: izq = paso 1, = paso 2, = paso 3 (los «=» quedan alineados)
export const ec = (izq, ...pasos) => pasos.map((p, i) => `⟦e⟧${i ? '' : izq}⟦=⟧${p}`).join('\n')
