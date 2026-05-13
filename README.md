📘 3x3-Super
============

**Tablero:** 7x7

**Jugadores:** 2 - 8

**Objetivo:** Alcanzar 5 puntos

**Puntuación:** 3 en línea = 1 punto

🎮 Cómo jugar
-------------

1.  **Inicio de turno:** se activan efectos de turno en este orden:  
    _Destructor → Germen → Corredor → Incendio_
2.  Coloca una ficha en el tablero.
3.  Si se activan efectos, se resuelven.
4.  Los efectos encadenados se resuelven en orden.
5.  Se verifica si hay 3 en línea.
6.  Si hay 3 en línea:
    *   Se activan efectos de **ACTIVACIÓN**
    *   Se gana 1 punto
    *   Se destruyen las 3 fichas
    *   Se activan efectos de **DESTRUCCIÓN**
    *   Los efectos encadenados se resuelven en orden.
7.  Turno del siguiente jugador.

⚠️ **Nota:** Los efectos pueden ser anulados en cualquier momento con **Negador**.

📄 Ver reglas completas en PDF:
👉 [Abrir PDF](./doc/doc.pdf)
---------
📄 Ver Fichas para Imprimir parte frontal:
👉 [Abrir PDF](./doc/front.pdf)
---------
📄 Ver Fichas para Imprimir parte tracera:
👉 [Abrir PDF](./doc/back.pdf)
---------
🧩 Fichas
---------


### Negador

_**(MANO):** Actívala desde tu mano en cualquier momento. No se coloca. Se destruye tras usarla._

Anula un efecto. La ficha seleccionada se comporta como Ficha sin efecto.

### Duplicador

_**(ACTIVACION):** Al formar 3 en línea, desata su efecto._

Se duplica en una dirección. Sobrevive al 3 en linea.

### Protector

_**(ACTIVACION):** Al formar 3 en línea, desata su efecto._

Protege una ficha de ser destruida por 3 en línea.

### Trampa Simple

_**(DESTRUCCION):** Al ser destruida, libera su efecto._

Destruye las fichas señaladas.

### Trampa Lineal

_**(DESTRUCCION):** Al ser destruida, libera su efecto._

Arrasa toda la línea señalada.

### Muro

_**(DESTRUCCION):** Al ser destruida, libera su efecto._

Inamovible. Se voltea simbolizando un muro.  
Muro: Inamovible e inmune a destrucción. Bloquea efectos en línea. Solo puede existir un muro, al crearce otro, el actual es removido del tablero. La ficha puede ser usada para 3 en linea, el muro no.

### Eliminacion Simple

_**(INSTANTANEA):** Al colocarla, su efecto se activa al instante._

Destruye las fichas señaladas.

### Eliminacion Linea

_**(INSTANTANEA):** Al colocarla, su efecto se activa al instante._

Destruye toda la línea señalada.

### Francotirador

_**(INSTANTANEA):** Al colocarla, su efecto se activa al instante._

Elimina una ficha a elección.

### Peso

_**(INSTANTANEA):** Al colocarla, su efecto se activa al instante._

Empuja todas las fichas en la dirección indicada hasta el límite.

### Destructor

_**(TURNO):** Al inicio de tu turno, activa su efecto (excepto el turno en que entra)._

Si apunta a vacío, coloca una ficha sin efecto de la mano. Si apunta a ficha, la destruye. Luego gira.

### Germen

_**(TURNO):** Al inicio de tu turno, activa su efecto (excepto el turno en que entra)._

Infecta: destruye una ficha y la reemplaza por una sin efecto de la mano.

### Corredor

_**(TURNO):** Al inicio de tu turno, activa su efecto (excepto el turno en que entra)._

Avanza en su dirección. Destruye al impactar. Inmune al moverse. No atraviesa muros.

### Incendio

_**(TURNO):** Al inicio de tu turno, activa su efecto (excepto el turno en que entra)._

Quema una ficha. Si no hay objetivo, se destrulle.

### Sin Efecto

_**(SIN\_EFECTO):** No hace nada._

Ficha básica. Sin poder.


## Developer

[Francisco Blanco](https://franciscoblanco.vercel.app/)

[Gitlab franciscoblancojn](https://gitlab.com/franciscoblancojn)

[Email blancofrancisco34@gmail.com](mailto:blancofrancisco34@gmail.com)
