const plans = {
    EF1: {
        code: "EF1",
        name: "Ensino Fundamental I",
        gradeRange: "1º ao 5º ano",
        subjects: [
            { id: "matematica", name: "Matemática", description: "Descubra números, operações e formas no dia a dia.", icon: "🔢", topics: ["Números e contagem", "Adição e subtração", "Formas e medidas"] },
            { id: "portugues", name: "Língua Portuguesa", description: "Leia, escreva e explore as palavras.", icon: "📖", topics: ["Leitura e interpretação", "Escrita e ortografia", "Histórias e personagens"] },
            { id: "ciencias", name: "Ciências", description: "Conheça a natureza e o mundo ao seu redor.", icon: "🔬", topics: ["Corpo e saúde", "Plantas e animais", "Água e ambiente"] },
            { id: "historia", name: "História", description: "Investigue histórias, memórias e o tempo.", icon: "🕰️", topics: ["Minha história", "Família e comunidade", "Passagem do tempo"] },
            { id: "geografia", name: "Geografia", description: "Observe os lugares e as paisagens onde vivemos.", icon: "🌍", topics: ["Casa e escola", "Paisagens", "Mapas e caminhos"] }
        ]
    },
    EF2: {
        code: "EF2",
        name: "Ensino Fundamental II",
        gradeRange: "6º ao 9º ano",
        subjects: [
            { id: "matematica", name: "Matemática", description: "Resolva desafios com números e pensamento lógico.", icon: "🔢", topics: ["Frações e decimais", "Razão e proporção", "Geometria e medidas"] },
            { id: "portugues", name: "Língua Portuguesa", description: "Interprete diferentes textos e aprimore sua escrita.", icon: "📖", topics: ["Gêneros textuais", "Interpretação de texto", "Gramática em contexto"] },
            { id: "ciencias", name: "Ciências", description: "Investigue os fenômenos naturais e o ambiente.", icon: "🔬", topics: ["Corpo humano", "Ecossistemas", "Matéria e energia"] },
            { id: "historia", name: "História", description: "Conheça diferentes sociedades e transformações históricas.", icon: "🏛️", topics: ["Mundos antigos", "Sociedades medievais", "Brasil e cidadania"] },
            { id: "geografia", name: "Geografia", description: "Entenda territórios, paisagens e suas relações.", icon: "🌍", topics: ["Cartografia", "Paisagem e espaço", "População e território"] },
            { id: "ingles", name: "Língua Inglesa", description: "Pratique comunicação e vocabulário em inglês.", icon: "💬", topics: ["Apresentações", "Cotidiano e vocabulário", "Leitura guiada"] }
        ]
    },
    EM: {
        code: "EM",
        name: "Ensino Médio",
        gradeRange: "1º ao 3º ano",
        subjects: [
            { id: "matematica", name: "Matemática", description: "Desenvolva raciocínio matemático para a escola e o vestibular.", icon: "🔢", topics: ["Funções", "Geometria", "Estatística e probabilidade"] },
            { id: "linguagens", name: "Linguagens e Redação", description: "Leia criticamente, interprete e organize suas ideias.", icon: "✍️", topics: ["Interpretação de texto", "Literatura", "Redação e argumentação"] },
            { id: "biologia", name: "Biologia", description: "Explore a vida, os organismos e suas relações.", icon: "🧬", topics: ["Citologia", "Genética", "Ecologia"] },
            { id: "fisica", name: "Física", description: "Entenda as leis que explicam movimentos e fenômenos.", icon: "⚡", topics: ["Cinemática", "Energia", "Eletricidade"] },
            { id: "quimica", name: "Química", description: "Investigue materiais e suas transformações.", icon: "⚗️", topics: ["Estrutura atômica", "Ligações e reações", "Química e cotidiano"] },
            { id: "historia", name: "História", description: "Analise processos históricos e desafios do presente.", icon: "🏛️", topics: ["Brasil", "História contemporânea", "Cidadania e sociedade"] },
            { id: "geografia", name: "Geografia", description: "Compreenda questões territoriais, sociais e ambientais.", icon: "🌍", topics: ["Geopolítica", "Urbanização", "Clima e ambiente"] },
            { id: "filosofia", name: "Filosofia e Sociologia", description: "Pense criticamente sobre ideias, pessoas e sociedade.", icon: "💭", topics: ["Ética e pensamento", "Cultura e identidade", "Sociedade e política"] }
        ]
    }
};

export function getCoursePlan(code) {
    return plans[code] ?? null;
}
