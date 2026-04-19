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
        decription:"Anula un efecto. La ficha seleccionada se comporta como Ficha sin efecto.",
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
        decription:"Se duplica en una dirección. Sobrevive al 3 en linea.",
    },
    {
        power:IPowers.Protector,
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
        decription:"Protege una ficha de ser destruida por 3 en línea.",
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
        decription:"Destruye las fichas señaladas.",
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
        decription:"Arrasa toda la línea señalada.",
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
        decription : <>
            Inamovible. Se voltea simbolizando un muro.
            <br/>
            Muro: Inamovible e inmune a destrucción.  Bloquea efectos en línea. Solo puede existir un muro, al crearce otro, el actual es removido del tablero. La ficha puede ser usada para 3 en linea, el muro no.
        </>,
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
        decription:"Destruye las fichas señaladas.",
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
        decription:"Destruye toda la línea señalada.",
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
        decription:"Elimina una ficha a elección.",
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
        decription:"Empuja todas las fichas en la dirección indicada hasta el límite.",
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
        decription:"Si apunta a vacío, coloca una ficha sin efecto de la mano. Si apunta a ficha, la destruye. Luego gira.",
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
        decription:"Infecta: destruye una ficha y la reemplaza por una sin efecto de la mano.",
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
        decription:"Avanza en su dirección. Destruye al impactar. Inmune al moverse. No atraviesa muros.",
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
        decription:"Quema una ficha. Si no hay objetivo, se destrulle.",
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
        decription:"Ficha básica. Sin poder.",
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