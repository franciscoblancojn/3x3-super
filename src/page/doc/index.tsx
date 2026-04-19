import { Ficha } from "../../components/Ficha"
import { FICHAS } from "../../data/fichas"
import { IActionDescription } from "../../interface/action"
import { IUsers } from "../../interface/users"

export const PageDoc = () => {
    return (
        <div className="page-doc">

            {/* 🧾 HEADER */}
            <h1>📘 3x3-Super</h1>

            <section>
                <p><strong>Tablero:</strong> 7x7</p>
                <p><strong>Jugadores:</strong> 2 - 7</p>
                <p><strong>Objetivo:</strong> Alcanzar 5 puntos</p>
                <p><strong>Puntuación:</strong> 3 en línea = 1 punto</p>
            </section>

            {/* 🎮 GAMEPLAY */}
            <section>
                <h2>🎮 Cómo jugar</h2>

                <ol>
                    <li>
                        <strong>Inicio de turno:</strong> se activan efectos de turno en este orden:
                        <br />
                        <em>Destructor → Germen → Corredor → Incendio</em>
                    </li>

                    <li>Coloca una ficha en el tablero.</li>

                    <li>Si se activan efectos, se resuelven.</li>

                    <li>Los efectos encadenados se resuelven en orden.</li>

                    <li>Se verifica si hay 3 en línea.</li>

                    <li>
                        Si hay 3 en línea:
                        <ul>
                            <li>Se activan efectos de <strong>ACTIVACIÓN</strong></li>
                            <li>Se gana 1 punto</li>
                            <li>Se destruyen las 3 fichas</li>
                            <li>Se activan efectos de <strong>DESTRUCCIÓN</strong></li>
                            <li>Los efectos encadenados se resuelven en orden.</li>
                        </ul>
                    </li>

                    <li>Turno del siguiente jugador.</li>
                </ol>

                <p>
                    ⚠️ <strong>Nota:</strong> Los efectos pueden ser anulados en cualquier momento con <strong>Negador</strong>.
                </p>
            </section>

            {/* 🧩 FICHAS */}
            <section>
                <h2>🧩 Fichas</h2>

                <div className="fichas-list">
                    {FICHAS.map((ficha, i) => (
                        <div
                            key={i}
                            className="ficha-description"
                        >
                            <h3>{ficha.power.replaceAll("_"," ")}</h3>

                            <i>
                                <strong>({ficha.action}):</strong>{" "}
                                {IActionDescription[ficha.action]}
                            </i>

                            {ficha.decription && (
                                <p>{ficha.decription}</p>
                            )}

                            <div className="variaciones">
                                {ficha.variations.map((v, j) => (
                                    <Ficha
                                        key={`${i}-${j}`}
                                        {...ficha}
                                        variation={v}
                                        user={IUsers.Alianza}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

        </div>
    )
}