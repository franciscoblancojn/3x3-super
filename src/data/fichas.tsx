import { IAction } from "../interface/action";
import type { IFicha } from "../interface/ficha";
import { IPowers } from "../interface/powers";

export const FICHAS_MANO : IFicha[] = [
    {
        power:IPowers.Negador,
        action:IAction.MANO,
        variations:[
            [
                [1,1,1],
                [1,0,1],
                [1,1,1],
            ]
        ],
        decription:"Bloquea cualquier activacion de efecto. La ficha seleccionada se comporta como Ficha sin efecto.",
    },
]
export const FICHAS_ACTIVACION : IFicha[] = [
    {
        power:IPowers.Duplicador,
        action:IAction.ACTIVACION,
        variations:[
            [
                [0,0,1],
                [0,0,0],
                [1,0,0],
            ],
            [
                [0,1,0],
                [0,0,0],
                [0,1,0],
            ],
        ],
        decription:"Duplica la ficha en una direccion. Evita ser destruida en 3 en linea.",
    },
    {
        power:IPowers.Procector,
        action:IAction.ACTIVACION,
        variations:[
            [
                [0,1,0],
                [0,0,1],
                [0,0,1],
            ],
            [
                [0,1,1],
                [1,0,0],
                [1,0,0],
            ],
        ],
        decription:"Evita que una ficha que apunte sea destruida en 3 en linea.",
    },
]
export const FICHAS_DESTRUCCION : IFicha[] = [
    {
        power:IPowers.Trampa_Simple,
        action:IAction.DESTRUCCION,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [0,1,0],
            ],
            [
                [1,0,1],
                [0,0,0],
                [1,0,1],
            ],
            [
                [0,1,1],
                [0,0,0],
                [1,0,0],
            ],
        ],
        decription:"Destrulle las fichas a las que apunte.",
    },
    {
        power:IPowers.Trampa_Lineal,
        action:IAction.DESTRUCCION,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [0,0,0],
            ],
            [
                [0,0,1],
                [0,0,0],
                [0,0,0],
            ],
        ],
        decription:"Destrulle las fichas de la linea a la que apunte.",
    },
    {
        power:IPowers.Muro,
        action:IAction.DESTRUCCION,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [0,0,0],
            ],
        ],
        decription:"Se voltea simbolizando un muro. Esta ficha no puede ser movida por Peso. Solo puede existir un muro a la ves, al crearce otro muro, el actual es removido del tablero. El muro bloquea efectos de destruccion en linea, y no se ve afectado por efectos de destruccion. La ficha puede ser usada para 3 en linea, el muro no.",
    },
]
export const FICHAS_INSTANTANEA : IFicha[] = [
    {
        power:IPowers.Eliminacion_Simple,
        action:IAction.INSTANTANEA,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [0,1,0],
            ],
            [
                [1,0,1],
                [0,0,0],
                [1,0,1],
            ],
            [
                [0,1,1],
                [0,0,0],
                [1,0,0],
            ],
        ],
        decription:"Destrulle las fichas a las que apunte.",
    },
    {
        power:IPowers.Eliminacion_Linea,
        action:IAction.INSTANTANEA,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [0,0,0],
            ],
            [
                [0,0,1],
                [0,0,0],
                [0,0,0],
            ],
        ],
        decription:"Destrulle las fichas de la linea a la que apunte.",
    },
    {
        power:IPowers.Francotirador,
        action:IAction.INSTANTANEA,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [0,0,0],
            ],
        ],
        decription:"Destrulle 1 ficha seleccionada.",
    },
    {
        power:IPowers.Peso,
        action:IAction.INSTANTANEA,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [0,0,0],
            ],
        ],
        decription:"Mueve todas las fichas del tablero en direccion a donde apunte hasta no poder moverce mas.",
    },
]
export const FICHAS_TURNO : IFicha[] = [
    {
        power:IPowers.Destructor,
        action:IAction.TURNO,
        variations:[
            [
                [0,0,0],
                [0,0,1],
                [0,0,0],
            ]
        ],
        decription:"Si la casilla donde apunta esta vacia y tiene una ficha sin efecto en la mano, puede colocar a ficha sin efecto a donde apunta. Si la casilla donde apunta esta llena, destrulle dicha ficha. Gira 90 grados al finalizar efecto.",
    },
    {
        power:IPowers.Germen,
        action:IAction.TURNO,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [1,0,1],
            ]
        ],
        decription:"Si una casilla donde apunta esta llena y tiene una ficha sin efecto en la mano, puede destruir la ficha y colocar la ficha sin efecto.",
    },
    {
        power:IPowers.Corredor,
        action:IAction.TURNO,
        variations:[
            [
                [0,1,0],
                [0,0,0],
                [1,0,0],
            ],
            [
                [0,1,0],
                [0,0,0],
                [0,0,1],
            ],
        ],
        decription:"Se mueve en una dirreccion donde apunta, si la casilla donde se mueve esta llena, destrulle la ficha. Durante su movimiento es inmune a efecto de destruccion. No puede moverce a casillas con muros o fichas muro.",
    },
    {
        power:IPowers.Incendio,
        action:IAction.TURNO,
        variations:[
            [
                [0,1,0],
                [1,0,1],
                [0,1,0],
            ],
            [
                [1,0,1],
                [0,0,0],
                [1,0,1],
            ],
        ],
        decription:"Destrulle una ficha a donde apunte, en caso de no tener fichas para destruir, esta ficha es destruida.",
    },
]

export const FICHAS_SIN_EFECTO : IFicha[] = [
    {
        power:IPowers.Sin_Efecto,
        action:IAction.SIN_EFECTO,
        quantity:6,
        variations:[
            [
                [0,0,0],
                [0,0,0],
                [0,0,0],
            ]
        ],
        decription:"",
    },
]
export const FICHAS : IFicha[] = [
    ...FICHAS_MANO,
    ...FICHAS_ACTIVACION,
    ...FICHAS_DESTRUCCION,
    ...FICHAS_INSTANTANEA,
    ...FICHAS_TURNO,
    ...FICHAS_SIN_EFECTO,
]