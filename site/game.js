const canvas = document.querySelector("#adventure-canvas");

if (canvas) {
    const context = canvas.getContext("2d");
    const title = document.querySelector("#game-title");
    const subtitle = document.querySelector("#game-subtitle");
    const gameStatus = document.querySelector("#game-status");
    const introCard = document.querySelector("#intro-card");
    const introTitle = document.querySelector("#intro-title");
    const introCopy = document.querySelector("#intro-copy");
    const openCageButton = document.querySelector("#open-cage-button");
    const toast = document.querySelector("#game-toast");
    const levelLabel = document.querySelector("#game-level-label");
    const enemyCountLabel = document.querySelector("#enemy-count");
    const difficultyPanel = document.querySelector("#difficulty-panel");
    const progressPanel = document.querySelector("#progress-panel");
    const progressBackdrop = document.querySelector("#progress-backdrop");
    const progressPhaseBadge = document.querySelector("#progress-phase-badge");
    const progressCount = document.querySelector("#progress-count");
    const progressTrack = document.querySelector("#progress-track");
    const progressFill = document.querySelector("#progress-fill");
    const progressSteps = document.querySelector("#progress-steps");
    const quizPanel = document.querySelector("#quiz-panel");
    const quizTitle = document.querySelector("#quiz-title");
    const quizProgress = document.querySelector("#quiz-progress");
    const quizQuestion = document.querySelector("#quiz-question");
    const quizAnswers = document.querySelector("#quiz-answers");
    const quizFeedback = document.querySelector("#quiz-feedback");
    const quizNext = document.querySelector("#quiz-next");
    const phasePanel = document.querySelector("#phase-panel");
    const phaseCopy = document.querySelector("#phase-copy");
    const advancePhaseButton = document.querySelector("#advance-phase-button");
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get("materia");
    const keys = new Set();
    const worldWidth = 2500;
    const groundY = 420;
    const platforms = [
        { x: 510, y: 340, width: 150 },
        { x: 790, y: 285, width: 145 },
        { x: 1120, y: 345, width: 180 },
        { x: 1490, y: 290, width: 150 },
        { x: 1830, y: 340, width: 190 },
        { x: 2180, y: 285, width: 150 }
    ];
    const enemyPositions = [610, 950, 1290, 1640, 2010];
    const player = { x: 330, y: groundY - 54, width: 38, height: 54, velocityY: 0, grounded: true };
    const mascot = { x: 134, y: groundY - 88 };
    const cage = { x: 112, openAt: 0 };
    let active = false;
    let cutsceneStartedAt = 0;
    let cutsceneFinishing = false;
    let lastFrame = 0;
    let toastTimer = 0;
    let jumpReady = true;
    let activePanel = null;
    let currentPhase = 0;
    let unlockedDifficulty = 0;
    let enemies = enemyPositions.map((x, index) => ({ x, index, defeated: false }));
    let activeEnemy = null;
    let battleQuestions = [];
    let questionIndex = 0;
    let correctAnswers = 0;
    let answerLocked = false;
    let phaseCompleted = false;
    let gameFinished = false;

    const subjectNames = new Map([
        ["matematica", "Matemática"],
        ["portugues", "Língua Portuguesa"],
        ["ciencias", "Ciências"],
        ["historia", "História"],
        ["geografia", "Geografia"],
        ["ingles", "Língua Inglesa"],
        ["linguagens", "Linguagens e Redação"],
        ["biologia", "Biologia"],
        ["fisica", "Física"],
        ["quimica", "Química"],
        ["filosofia", "Filosofia e Sociologia"]
    ]);

    const questionBank = {
        matematica: [
            ["Uma receita pede 2 xícaras de água para 1 de suco. Para 4 xícaras de suco, quanta água é necessária?", "8 xícaras", "4 xícaras", "6 xícaras", "2 xícaras", "A proporção dobra junto: 4 × 2 = 8."],
            ["Uma mochila custa R$ 80 e está com 25% de desconto. Qual é o novo preço?", "R$ 60", "R$ 55", "R$ 65", "R$ 75", "25% de 80 é 20; 80 − 20 = 60."],
            ["Um ônibus percorre 150 km em 3 horas, mantendo a mesma velocidade. Quantos quilômetros percorre em 5 horas?", "250 km", "200 km", "300 km", "450 km", "A velocidade é 50 km/h; em 5 horas, percorre 250 km."],
            ["Uma área retangular mede 8 m por 5 m. Qual é sua área?", "40 m²", "26 m²", "13 m²", "80 m²", "Área de retângulo é base × altura: 8 × 5."],
            ["Qual número completa a sequência 3, 6, 12, 24, ...?", "48", "36", "30", "27", "Cada termo é o dobro do anterior."],
            ["Uma caixa tem 3 bolas vermelhas e 7 azuis. Sem olhar, qual cor é mais provável retirar?", "Azul", "Vermelha", "As duas têm a mesma chance", "Não dá para comparar", "Há mais bolas azuis do que vermelhas."],
            ["Quanto é 3/4 de 20?", "15", "12", "16", "5", "20 ÷ 4 = 5; 5 × 3 = 15."],
            ["Um filme começa às 14h35 e dura 1h50. A que horas termina?", "16h25", "15h85", "16h15", "15h25", "Somando 1 hora e depois 50 minutos, termina às 16h25."],
            ["Um jardim quadrado tem lados de 6 m. Quantos metros de cerca são necessários para contorná-lo?", "24 m", "36 m", "12 m", "18 m", "O perímetro do quadrado é 4 × 6 = 24."],
            ["Quatro cadernos iguais custam R$ 36. Quanto custa cada caderno?", "R$ 9", "R$ 8", "R$ 12", "R$ 32", "36 dividido igualmente por 4 é 9."]
        ],
        portugues: [
            ["Na frase “A menina curiosa abriu o livro”, qual palavra caracteriza a menina?", "Curiosa", "Menina", "Abriu", "Livro", "“Curiosa” é a característica atribuída à menina."],
            ["Qual frase está pontuada corretamente como pergunta?", "Você terminou a leitura?", "Você terminou a leitura.", "Você terminou a leitura!", "Você, terminou a leitura.", "O ponto de interrogação marca uma pergunta."],
            ["Na frase “Pedro correu porque estava atrasado”, por que Pedro correu?", "Porque estava atrasado", "Porque queria dormir", "Porque chovia", "O texto não informa", "A oração com “porque” explica o motivo."],
            ["Qual palavra tem sentido parecido com “alegre”?", "Contente", "Distante", "Silencioso", "Pesado", "“Contente” pode substituir “alegre” nesse contexto."],
            ["Em “As crianças brincaram no parque”, quem praticou a ação?", "As crianças", "O parque", "Brincaram", "A ação", "“As crianças” é quem brinca."],
            ["Qual opção completa: “Ontem, nós ___ ao museu.”", "fomos", "iremos", "vamos", "ia", "“Ontem” indica uma ação já concluída: fomos."],
            ["Qual sinal costuma encerrar uma frase que afirma algo?", "Ponto final", "Vírgula", "Dois-pontos", "Parênteses", "O ponto final encerra uma declaração."],
            ["Na frase “O vento sussurrava”, há uma comparação poética. O vento recebeu uma ação de quem?", "De uma pessoa", "De uma pedra", "De um número", "De uma planta", "Sussurrar é uma ação humana atribuída ao vento."],
            ["Qual palavra está escrita corretamente?", "Exceção", "Eceção", "Excessão", "Eseção", "A grafia correta é “exceção”."],
            ["Em “Ela guardou o caderno”, qual é a ação?", "Guardou", "Ela", "Caderno", "O", "“Guardou” é o verbo que indica a ação."]
        ],
        ciencias: [
            ["Uma planta ficou vários dias sem luz. Qual processo será mais prejudicado?", "Fotossíntese", "Evaporação", "Digestão", "Magnetismo", "A planta precisa de luz para realizar fotossíntese."],
            ["Qual atitude ajuda a economizar água durante a escovação dos dentes?", "Fechar a torneira", "Deixar a torneira aberta", "Usar água quente", "Escovar por menos tempo sem fechar a torneira", "Fechar a torneira evita desperdício enquanto a escova é usada."],
            ["Por que lavar as mãos ajuda a prevenir doenças?", "Remove microrganismos e sujeira", "Aumenta a temperatura do corpo", "Substitui todas as vacinas", "Impede a respiração", "A higiene reduz a transmissão de microrganismos."],
            ["Qual destes animais é um vertebrado?", "Sapo", "Minhoca", "Borboleta", "Água-viva", "O sapo possui coluna vertebral."],
            ["O gelo derreteu e virou água líquida. O que aconteceu?", "Mudança de estado físico", "Criação de uma nova substância", "Combustão", "Congelamento", "A água continua sendo água, mas mudou do estado sólido para o líquido."],
            ["Em uma cadeia alimentar, de onde as plantas obtêm principalmente energia?", "Do Sol", "Do solo sozinho", "Dos animais", "Da Lua", "A luz solar fornece energia para a fotossíntese."],
            ["Qual órgão bombeia o sangue pelo corpo?", "Coração", "Pulmão", "Estômago", "Rim", "O coração impulsiona o sangue pela circulação."],
            ["Por que separar papel e vidro para reciclagem?", "Para facilitar o reaproveitamento dos materiais", "Para misturá-los ao lixo orgânico", "Para torná-los invisíveis", "Para gastar mais matéria-prima", "A separação permite que cada material seja reciclado corretamente."],
            ["A sombra de uma árvore muda de tamanho durante o dia. Qual é uma causa disso?", "A posição aparente do Sol muda", "A árvore cresce e encolhe a cada hora", "A sombra produz luz", "O chão gira em torno da árvore", "A posição do Sol no céu altera a direção e o tamanho da sombra."],
            ["Qual mistura pode ser separada com um filtro de papel?", "Água e areia", "Água e sal dissolvido", "Água e açúcar dissolvido", "Água e álcool", "A areia fica retida no filtro, enquanto a água passa."]
        ],
        historia: [
            ["Por que cartas e fotografias antigas são fontes para estudar o passado?", "Trazem registros e pistas de outras épocas", "Preveem exatamente o futuro", "Substituem todas as entrevistas", "Não têm relação com a história", "Fontes históricas ajudam a investigar como as pessoas viviam."],
            ["Uma comunidade mudou seus costumes ao longo de muitas gerações. O que isso mostra?", "A sociedade se transforma com o tempo", "A história nunca muda", "Só os objetos fazem história", "O passado é igual ao presente", "Mudanças nos costumes fazem parte dos processos históricos."],
            ["Para que serve uma linha do tempo?", "Organizar acontecimentos em ordem", "Medir a distância entre cidades", "Descobrir a temperatura", "Substituir documentos", "A linha do tempo organiza eventos cronologicamente."],
            ["Por que duas pessoas podem contar versões diferentes do mesmo acontecimento?", "Cada uma pode ter vivido e interpretado o fato de modo diferente", "Uma delas necessariamente inventou tudo", "O acontecimento não ocorreu", "A memória nunca muda", "Perspectivas e experiências influenciam os relatos."],
            ["O que um objeto arqueológico pode revelar?", "Pistas sobre o modo de vida de um povo", "A previsão do tempo de amanhã", "O nome de todas as pessoas da época", "A idade exata do universo", "Objetos encontrados ajudam a conhecer hábitos e técnicas."],
            ["O que significa dizer que uma fonte histórica precisa ser contextualizada?", "Entender quando, onde e por quem foi produzida", "Ler somente o título", "Ignorar quem a criou", "Usá-la sem comparar evidências", "O contexto ajuda a interpretar corretamente a fonte."],
            ["Uma invenção muda a forma de comunicação de uma sociedade. Isso pode ser estudado pela história?", "Sim, pois tecnologias também transformam a vida social", "Não, história trata só de reis", "Não, invenções não afetam pessoas", "Sim, mas apenas se for antiga", "A história estuda mudanças sociais, culturais, políticas e tecnológicas."],
            ["Por que preservar patrimônios históricos?", "Para cuidar de memórias e referências coletivas", "Para apagar as diferenças culturais", "Para impedir qualquer pesquisa", "Para tornar todos os lugares iguais", "O patrimônio ajuda a manter vivas memórias e identidades."],
            ["O que é uma mudança histórica?", "Uma transformação percebida ao longo do tempo", "Um evento que nunca aconteceu", "Uma data sem contexto", "Uma repetição idêntica do presente", "Mudanças históricas mostram o que se transforma ou permanece."],
            ["Qual é uma atitude crítica ao ler um relato do passado?", "Comparar fontes e considerar o ponto de vista", "Aceitar tudo sem perguntar", "Ignorar a data do relato", "Descartar qualquer evidência", "A comparação de fontes permite uma interpretação mais cuidadosa."]
        ],
        geografia: [
            ["Por que um mapa precisa de legenda?", "Para explicar o significado dos símbolos", "Para mostrar o autor da história", "Para indicar a temperatura do papel", "Para substituir a escala", "A legenda informa o que cada símbolo representa."],
            ["Em um mapa, 1 cm representa 10 km. Dois lugares estão separados por 3 cm. Qual é a distância real?", "30 km", "13 km", "20 km", "300 km", "A distância é 3 × 10 = 30 km."],
            ["Qual atitude ajuda a reduzir enchentes nas cidades?", "Manter bueiros limpos e preservar áreas permeáveis", "Cobrir todos os terrenos com concreto", "Jogar lixo nas ruas", "Retirar toda a vegetação", "A drenagem e o solo permeável ajudam a água da chuva a escoar."],
            ["O que costuma causar uma ilha de calor urbana?", "Concentração de construções e pouca vegetação", "Muitas áreas arborizadas", "A presença de rios limpos", "A baixa circulação de pessoas", "Asfalto, edifícios e pouca vegetação retêm mais calor."],
            ["O que a escala de um mapa permite comparar?", "A distância no mapa com a distância real", "O clima de duas épocas", "A altura das letras", "A população de cada país", "A escala relaciona as medidas desenhadas às medidas reais."],
            ["Por que rios são importantes para muitas comunidades?", "Fornecem água e podem apoiar atividades e ecossistemas", "Impedem toda forma de vida", "Só servem como fronteiras", "Não influenciam a ocupação humana", "Rios sustentam ecossistemas e diferentes usos humanos."],
            ["Qual exemplo mostra uma paisagem transformada pelas pessoas?", "Um bairro com ruas e edifícios", "Uma montanha sem construções", "Uma floresta intocada", "Uma nuvem no céu", "Ruas e edifícios são elementos construídos pelas pessoas."],
            ["Uma região tem pouca chuva por muitos meses. Qual característica é mais provável?", "Vegetação adaptada à falta de água", "Florestas sempre alagadas", "Rios transbordando diariamente", "Neve constante em toda parte", "Plantas de regiões secas podem ter adaptações para economizar água."],
            ["Por que usar transporte público pode ajudar uma cidade?", "Pode transportar mais pessoas usando menos veículos", "Aumenta sempre o número de carros", "Elimina a necessidade de planejamento", "Impede a circulação nas ruas", "Um transporte coletivo eficiente pode reduzir carros nas vias."],
            ["O que as coordenadas geográficas ajudam a localizar?", "Um ponto na superfície terrestre", "A idade de uma rocha", "A altura de uma pessoa", "A velocidade de um rio", "Latitude e longitude indicam posições na superfície terrestre."]
        ],
        ingles: [
            ["Em inglês, o que significa “library”?", "Biblioteca", "Livraria", "Laboratório", "Cozinha", "“Library” é o lugar onde se consultam ou emprestam livros."],
            ["Complete: “She ___ soccer every Saturday.”", "plays", "play", "playing", "played yesterday", "Com “she” no presente simples, usa-se “plays”."],
            ["Qual pergunta combina com a resposta “My name is Ana”?", "What is your name?", "How old is your bag?", "Where is the school?", "What time is lunch?", "A resposta informa o nome."],
            ["O que significa “Turn left at the corner”?", "Vire à esquerda na esquina", "Atravesse a ponte", "Vire à direita na escola", "Continue até amanhã", "“Turn left” significa virar à esquerda."],
            ["Qual palavra é o oposto de “hot”?", "Cold", "Warm", "Sunny", "Big", "“Cold” significa frio, o oposto de quente."],
            ["Complete: “They ___ studying now.”", "are", "is", "am", "be not", "Com “they”, usa-se “are” no presente contínuo."],
            ["Se alguém diz “Thank you”, qual resposta é adequada?", "You’re welcome", "Good night, yesterday", "I am a pencil", "Turn the window", "“You’re welcome” é uma resposta comum para agradecer."],
            ["O que “How many apples?” quer saber?", "Quantas maçãs", "Qual maçã é vermelha", "Onde está a maçã", "Quem comeu a maçã", "“How many” pergunta uma quantidade contável."],
            ["Qual frase fala de um hábito?", "I walk to school every day.", "I am walking right now.", "I walked yesterday.", "I will walk tomorrow.", "“Every day” indica um hábito ou rotina."],
            ["O que significa “The museum is next to the park”?", "O museu fica ao lado do parque", "O museu fica dentro do parque", "O parque fica longe do museu", "O museu fecha no parque", "“Next to” significa ao lado de."]
        ],
        linguagens: [
            ["Em uma notícia, qual parte costuma resumir o assunto principal?", "Manchete", "Lista de compras", "Legenda de mapa", "Receita", "A manchete apresenta de forma breve o tema da notícia."],
            ["Uma propaganda usa imagens e frases para convencer o público. Qual é sua intenção principal?", "Persuadir ou divulgar uma ideia ou produto", "Narrar sempre um fato antigo", "Ensinar uma fórmula matemática", "Marcar o ritmo de uma música", "A publicidade procura influenciar o público."],
            ["Por que verificar a fonte de uma informação antes de compartilhá-la?", "Para avaliar sua confiabilidade", "Para torná-la mais curta", "Para mudar o idioma", "Para evitar ler o conteúdo", "Conferir a fonte ajuda a reconhecer informações confiáveis."],
            ["Em uma argumentação, para que serve uma evidência?", "Dar apoio a uma ideia defendida", "Substituir o tema", "Confundir o leitor", "Indicar somente a opinião contrária", "Evidências sustentam os argumentos."],
            ["Qual recurso ajuda a perceber o tom de uma fala em uma apresentação?", "Entonação e expressão", "Somente o tamanho do papel", "A numeração das páginas", "A cor da cadeira", "Entonação e expressão podem comunicar intenção e emoção."],
            ["Uma crônica costuma partir de qual tipo de situação?", "Uma cena cotidiana observada com olhar pessoal", "Uma tabela sem contexto", "Uma instrução de montagem", "Um mapa de relevo", "Crônicas frequentemente refletem sobre situações do cotidiano."],
            ["O que significa interpretar um texto?", "Construir sentido usando pistas e contexto", "Contar apenas as letras", "Ignorar o que está escrito", "Trocar todas as palavras", "A interpretação combina informações explícitas e contexto."],
            ["Em um debate respeitoso, o que fazer ao discordar?", "Apresentar razões e ouvir o outro", "Interromper todas as falas", "Atacar a pessoa", "Mudar de assunto sempre", "Argumentar e escutar favorece o diálogo."],
            ["Uma imagem e uma legenda juntas podem fazer o quê?", "Complementar a informação da mensagem", "Apagar o texto automaticamente", "Transformar a imagem em som", "Eliminar o contexto", "Textos e imagens podem se complementar."],
            ["Qual pergunta ajuda a identificar o público de uma mensagem?", "Para quem ela foi produzida?", "Qual é a cor da página?", "Quantas letras tem o título?", "Quem imprimiu o papel?", "O público é o grupo a quem a mensagem se dirige."]
        ],
        biologia: [
            ["Qual organela é conhecida por participar da produção de energia na célula?", "Mitocôndria", "Núcleo", "Parede celular", "Vacúolo", "A mitocôndria participa da respiração celular."],
            ["Em uma cadeia alimentar, o que pode acontecer se muitos predadores desaparecerem?", "A população de algumas presas pode aumentar", "Todas as plantas deixam de existir imediatamente", "A energia solar desaparece", "Nenhuma população muda", "As relações entre predadores e presas influenciam suas populações."],
            ["Qual molécula guarda as instruções hereditárias dos seres vivos?", "DNA", "Água", "Glicose", "Oxigênio", "O DNA contém informação genética."],
            ["Qual é uma função importante das raízes das plantas?", "Absorver água e ajudar na fixação", "Produzir sons", "Capturar insetos em todas as plantas", "Transportar luz até as folhas", "Raízes absorvem água e sais minerais e fixam a planta."],
            ["Por que a vacinação ajuda a proteger uma população?", "Prepara o sistema imunológico para reconhecer agentes", "Substitui a alimentação", "Impede qualquer tipo de infecção para sempre", "Elimina todos os microrganismos do ambiente", "Vacinas estimulam a resposta de defesa do organismo."],
            ["Qual característica diferencia mamíferos de muitos outros vertebrados?", "Produzem leite para alimentar os filhotes", "Todos vivem na água", "Todos têm penas", "Respiram somente pela pele", "Mamíferos possuem glândulas mamárias."],
            ["O que ocorre com a diversidade de um ecossistema quando várias espécies desaparecem?", "A biodiversidade diminui", "A biodiversidade sempre aumenta", "Nada muda nas relações", "O ambiente deixa de ter matéria", "A perda de espécies reduz a biodiversidade."],
            ["Qual sistema do corpo transporta sangue e substâncias pelo organismo?", "Sistema circulatório", "Sistema esquelético", "Sistema tegumentar", "Sistema locomotor apenas", "O sistema circulatório distribui sangue pelo corpo."],
            ["Qual processo permite que plantas usem luz para produzir açúcares?", "Fotossíntese", "Fermentação", "Digestão", "Evaporação", "Na fotossíntese, plantas usam energia luminosa para produzir açúcares."],
            ["Por que antibióticos não são indicados contra vírus como o da gripe?", "Eles atuam contra bactérias, não contra vírus", "Vírus são sempre maiores que células", "Antibióticos são vitaminas", "A gripe não é causada por microrganismos", "Antibióticos tratam certas infecções bacterianas, não viroses."]
        ],
        fisica: [
            ["Uma bicicleta percorre 60 km em 2 horas. Qual foi a velocidade média?", "30 km/h", "120 km/h", "60 km/h", "15 km/h", "Velocidade média é distância dividida pelo tempo: 60 ÷ 2."],
            ["Por que um objeto cai quando é solto perto da superfície da Terra?", "A gravidade o atrai para a Terra", "O ar sempre o empurra para baixo", "A luz o puxa", "Ele perde toda a massa", "A força gravitacional atrai os objetos para a Terra."],
            ["Uma lâmpada ligada transforma energia elétrica principalmente em quais formas?", "Luz e calor", "Som e massa", "Água e vento", "Gravidade e alimento", "A lâmpada converte energia elétrica em luz e também calor."],
            ["Por que vemos um relâmpago antes de ouvir o trovão?", "A luz chega antes do som", "O som não viaja no ar", "O trovão acontece depois do raio", "A luz fica parada", "A luz se propaga muito mais rápido que o som."],
            ["O que acontece com a força necessária para mover uma caixa quando o atrito diminui?", "Em geral, fica mais fácil movê-la", "A caixa perde sua massa", "A gravidade desaparece", "A caixa se transforma em energia", "Menos atrito significa menor resistência ao movimento."],
            ["Em um circuito simples, o que costuma acontecer se o caminho elétrico é interrompido?", "A corrente deixa de circular", "A corrente fica infinita", "A pilha vira um ímã", "A lâmpada fica mais pesada", "Um circuito aberto interrompe a passagem da corrente."],
            ["Por que uma colher de metal parece mais fria que uma de madeira no mesmo ambiente?", "O metal conduz calor da mão mais rapidamente", "O metal tem sempre temperatura negativa", "A madeira produz calor", "A colher de metal não tem partículas", "O metal transfere calor da mão com mais rapidez."],
            ["O que uma alavanca pode ajudar a fazer?", "Mover uma carga usando uma força aplicada", "Criar energia sem fonte", "Eliminar a gravidade", "Mudar a cor dos objetos", "A alavanca é uma máquina simples que facilita certas tarefas."],
            ["Se a distância percorrida aumenta e o tempo fica igual, o que ocorre com a velocidade média?", "Aumenta", "Diminui sempre", "Fica zero", "Não pode ser comparada", "Velocidade média é distância dividida pelo tempo."],
            ["Por que usamos isolantes ao revestir fios elétricos?", "Para reduzir a passagem de corrente para o exterior", "Para aumentar o tamanho da pilha", "Para criar luz sem energia", "Para transformar o fio em água", "Materiais isolantes dificultam a passagem de corrente elétrica."]
        ],
        quimica: [
            ["O que acontece com as partículas de água quando ela evapora?", "Passam do líquido para o estado gasoso", "Transformam-se em oxigênio", "Desaparecem", "Viraram sal", "Evaporação é a passagem do líquido para o gás."],
            ["O que indica o símbolo H₂O?", "Uma molécula com hidrogênio e oxigênio", "Dois átomos de ouro", "Um tipo de sal", "Uma mistura de três líquidos", "A fórmula da água tem dois átomos de hidrogênio e um de oxigênio."],
            ["Misturar vinagre e bicarbonato produz bolhas. Qual evidência aparece?", "Formação de gás", "Congelamento imediato", "Desaparecimento da matéria", "Transformação em metal", "As bolhas indicam liberação de gás na reação."],
            ["Qual método ajuda a separar areia misturada à água?", "Filtração", "Imantação", "Destilação fracionada do ar", "Peneiração de líquidos", "O filtro retém a areia e deixa a água passar."],
            ["Por que o ferro pode enferrujar mais rapidamente em local úmido?", "Água e oxigênio favorecem a corrosão", "A água transforma ferro em plástico", "O oxigênio impede reações", "A umidade remove os átomos", "A ferrugem se forma pela reação do ferro com oxigênio na presença de água."],
            ["Em uma solução de água com sal, qual componente foi dissolvido?", "Sal", "Água", "O recipiente", "O ar", "O sal é o soluto; a água é o solvente."],
            ["Ao aquecer um cubo de gelo, ele derrete. Isso cria uma nova substância?", "Não, continua sendo água", "Sim, transforma-se em óleo", "Sim, transforma-se em sal", "Não, porque deixa de ter massa", "Derreter é uma mudança física de estado."],
            ["Qual partícula do átomo tem carga elétrica negativa?", "Elétron", "Próton", "Nêutron", "Núcleo", "O elétron tem carga negativa."],
            ["Para que serve um modelo de partículas em química?", "Ajudar a explicar como a matéria se comporta", "Mostrar a cor real de cada átomo", "Substituir todas as observações", "Prever o formato de qualquer objeto", "Modelos ajudam a representar e explicar fenômenos da matéria."],
            ["Por que não se deve misturar produtos de limpeza sem orientação?", "Podem ocorrer reações e liberar substâncias perigosas", "Todos os produtos viram água", "A mistura sempre fica mais fraca", "A mistura elimina a necessidade de rótulos", "Algumas combinações liberam gases ou causam reações perigosas."]
        ],
        filosofia: [
            ["Uma pessoa muda de opinião após ouvir bons argumentos. O que isso demonstra?", "Disposição para refletir e revisar ideias", "Que pensar é sempre inútil", "Que toda opinião é idêntica", "Que perguntas não ajudam", "A reflexão permite avaliar razões e rever conclusões."],
            ["Em um debate, qual diferença entre opinião e argumento?", "O argumento apresenta razões para sustentar uma ideia", "Opinião sempre tem números", "Argumento é apenas falar mais alto", "Não existe diferença", "Um argumento oferece justificativas que podem ser examinadas."],
            ["Por que uma regra pode ser considerada justa?", "Porque seus motivos e efeitos podem ser debatidos por quem é afetado", "Porque nunca pode ser questionada", "Porque beneficia somente uma pessoa", "Porque não precisa de explicação", "Refletir sobre justiça inclui avaliar razões e consequências."],
            ["Se uma informação parece convincente, qual atitude crítica é útil?", "Perguntar quais evidências a sustentam", "Compartilhá-la sem ler", "Ignorar todas as fontes", "Aceitá-la porque é popular", "Pensamento crítico examina argumentos e evidências."],
            ["O que significa respeitar alguém com quem se discorda?", "Ouvir suas razões sem abrir mão de argumentar", "Concordar com tudo", "Impedir que fale", "Atacar sua identidade", "Respeito permite discordância e diálogo."],
            ["Uma escolha afeta outras pessoas. Qual pergunta ética ajuda a pensar?", "Quais podem ser as consequências para cada pessoa?", "Qual opção é mais rápida, sem avaliar efeitos?", "Como evitar qualquer responsabilidade?", "Quem posso impedir de opinar?", "A ética considera ações e seus efeitos sobre as pessoas."],
            ["Por que distinguir fato de opinião é importante?", "Para avaliar que tipo de afirmação está sendo feita", "Para eliminar conversas", "Para tornar todas as ideias fatos", "Para evitar buscar evidências", "Fatos e opiniões são afirmações de tipos diferentes."],
            ["Em uma pesquisa, pessoas de grupos diferentes têm experiências distintas. O que é importante fazer?", "Ouvir perspectivas variadas", "Considerar somente a opinião mais alta", "Ignorar o contexto", "Supor que uma pessoa representa todos", "Perspectivas diversas tornam a análise mais cuidadosa."],
            ["Qual pergunta ajuda a examinar uma conclusão?", "As razões apresentadas realmente levam a essa conclusão?", "Quem falou mais alto?", "Quantas palavras tem a frase?", "A conclusão está em letra grande?", "A relação entre razões e conclusão é central para avaliar um argumento."],
            ["Por que pensar sobre a própria sociedade pode ser útil?", "Ajuda a compreender regras, valores e mudanças", "Impede qualquer mudança", "Apaga a história", "Substitui todas as conversas", "A reflexão social ajuda a entender como vivemos juntos."]
        ]
    };

    const subjectName = subjectNames.get(subjectId);
    if (!subjectName) {
        window.location.replace("/materias.html");
    } else {
        title.textContent = subjectName;
        subtitle.textContent = `Explore o mundo de ${subjectName} ao lado do seu mascote.`;
        document.title = `${subjectName} — EDUFIX`;
    }

    const roundRect = (x, y, width, height, radius) => {
        context.beginPath();
        context.roundRect(x, y, width, height, radius);
    };

    const drawCloud = (x, y, scale = 1) => {
        context.fillStyle = "rgba(255, 255, 255, .78)";
        context.beginPath();
        context.ellipse(x, y, 34 * scale, 14 * scale, 0, 0, Math.PI * 2);
        context.ellipse(x - 20 * scale, y + 3 * scale, 20 * scale, 11 * scale, 0, 0, Math.PI * 2);
        context.ellipse(x + 19 * scale, y + 4 * scale, 23 * scale, 12 * scale, 0, 0, Math.PI * 2);
        context.fill();
    };

    const drawPlayer = (x, y, time) => {
        const bob = player.grounded && (keys.has("a") || keys.has("d")) ? Math.sin(time / 75) * 2 : 0;
        context.save();
        context.translate(x, y + bob);
        context.fillStyle = "#e66f4c";
        roundRect(4, 14, 31, 31, 9);
        context.fill();
        context.fillStyle = "#293d50";
        roundRect(5, 39, 12, 14, 5);
        context.fill();
        roundRect(23, 39, 12, 14, 5);
        context.fill();
        context.fillStyle = "#ffd7b1";
        context.beginPath();
        context.arc(20, 13, 14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#5b382b";
        context.beginPath();
        context.arc(20, 9, 14, Math.PI, Math.PI * 2);
        context.fill();
        context.fillStyle = "#25394a";
        context.beginPath();
        context.arc(25, 15, 2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fffefa";
        roundRect(5, 2, 30, 7, 4);
        context.fill();
        context.fillStyle = "#4d8c64";
        roundRect(8, -3, 24, 8, 4);
        context.fill();
        context.restore();
    };

    const drawMascot = (x, y, time) => {
        const flap = Math.sin(time / 180) * 2;
        context.save();
        context.translate(x, y);
        context.fillStyle = "rgba(37, 57, 48, .16)";
        context.beginPath();
        context.ellipse(20, 38, 21, 5, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#9c77bd";
        context.beginPath();
        context.ellipse(20, 21, 18, 19, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#8562a7";
        context.beginPath();
        context.ellipse(5, 23, 8, 10 + flap, -.25, 0, Math.PI * 2);
        context.ellipse(35, 23, 8, 10 - flap, .25, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fffefa";
        context.beginPath();
        context.arc(14, 19, 6, 0, Math.PI * 2);
        context.arc(26, 19, 6, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#2a3837";
        context.beginPath();
        context.arc(15, 20, 2, 0, Math.PI * 2);
        context.arc(25, 20, 2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#e8ac55";
        context.beginPath();
        context.moveTo(20, 23);
        context.lineTo(16, 28);
        context.lineTo(24, 28);
        context.closePath();
        context.fill();
        context.restore();
    };

    const drawCage = (x, time) => {
        const opening = cage.openAt ? Math.min(1, (time - cage.openAt) / 950) : 0;
        context.save();
        context.translate(x, 0);
        context.fillStyle = "#8b6744";
        roundRect(-13, groundY - 17, 114, 18, 5);
        context.fill();
        context.fillStyle = "#8a7151";
        roundRect(0, groundY - 112, 82, 95, 10);
        context.fill();
        context.fillStyle = "#b99768";
        roundRect(7, groundY - 105, 68, 80, 5);
        context.fill();
        if (opening < 1) drawMascot(22, groundY - 88, time);
        context.strokeStyle = "#654d39";
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(10, groundY - 104);
        context.lineTo(10, groundY - 26);
        context.moveTo(29, groundY - 104);
        context.lineTo(29, groundY - 26);
        context.moveTo(48, groundY - 104);
        context.lineTo(48, groundY - 26);
        context.moveTo(67, groundY - 104);
        context.lineTo(67, groundY - 26);
        context.stroke();
        context.save();
        context.translate(82, groundY - 105);
        context.rotate(-opening * 1.15);
        context.fillStyle = "#d1b27f";
        context.fillRect(-2, 0, 8, 80);
        context.strokeStyle = "#654d39";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(0, 3);
        context.lineTo(0, 77);
        context.stroke();
        context.restore();
        context.restore();
    };

    const drawMiniIgnorance = (enemy, cameraX, time) => {
        const x = enemy.x - cameraX;
        const bounce = Math.sin(time / 180 + enemy.index) * 3;
        context.save();
        context.translate(x, groundY - 38 + bounce);
        context.fillStyle = "rgba(54, 43, 76, .2)";
        context.beginPath();
        context.ellipse(22, 42, 24, 5, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#66547e";
        context.beginPath();
        context.arc(22, 21, 21, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#907ca7";
        context.beginPath();
        context.arc(12, 8, 10, 0, Math.PI * 2);
        context.arc(30, 8, 10, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fffefa";
        context.beginPath();
        context.arc(15, 20, 6, 0, Math.PI * 2);
        context.arc(29, 20, 6, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#342c40";
        context.beginPath();
        context.arc(16, 21, 2.5, 0, Math.PI * 2);
        context.arc(28, 21, 2.5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#f4c86a";
        context.beginPath();
        context.arc(22, 31, 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fffefa";
        context.font = "700 13px Segoe UI, sans-serif";
        context.textAlign = "center";
        context.fillText("Mini ignorância", 22, -9);
        context.restore();
    };

    const drawDoor = (cameraX, isOpen) => {
        const x = worldWidth - 116 - cameraX;
        context.fillStyle = "#70523c";
        context.beginPath();
        context.roundRect(x, groundY - 106, 70, 106, [34, 34, 4, 4]);
        context.fill();
        context.fillStyle = isOpen ? "#f5cf73" : "#b98255";
        context.beginPath();
        context.roundRect(x + 8, groundY - 98, 54, 98, [27, 27, 2, 2]);
        context.fill();
        context.fillStyle = "#684a37";
        context.beginPath();
        context.arc(x + 49, groundY - 49, 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fffefa";
        context.font = "800 13px Segoe UI, sans-serif";
        context.textAlign = "center";
        context.fillText(isOpen ? "E · ENTRAR" : "PORTA", x + 35, groundY - 117);
    };

    const drawScene = (time) => {
        const width = canvas.width;
        const height = canvas.height;
        const cameraX = Math.max(0, Math.min(worldWidth - width, player.x - width * .38));
        context.clearRect(0, 0, width, height);

        const sky = context.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#9edbf1");
        sky.addColorStop(1, "#e5f5d9");
        context.fillStyle = sky;
        context.fillRect(0, 0, width, height);

        context.fillStyle = "#f9d879";
        context.beginPath();
        context.arc(790 - cameraX * .08, 88, 39, 0, Math.PI * 2);
        context.fill();
        for (let cloud = 0; cloud < 5; cloud += 1) {
            drawCloud(((cloud * 250 + 70 - cameraX * .16) % (width + 120)) - 40, 78 + (cloud % 3) * 48, .75 + (cloud % 2) * .2);
        }

        context.fillStyle = "#b8dcaa";
        for (let hill = 0; hill < 8; hill += 1) {
            const hillX = hill * 190 - (cameraX * .28 % 190);
            context.beginPath();
            context.ellipse(hillX + 80, 355, 130, 105, 0, 0, Math.PI * 2);
            context.fill();
        }
        context.fillStyle = "#8fc78b";
        for (let hill = 0; hill < 8; hill += 1) {
            const hillX = hill * 230 - (cameraX * .46 % 230);
            context.beginPath();
            context.ellipse(hillX + 100, 390, 125, 78, 0, 0, Math.PI * 2);
            context.fill();
        }

        context.fillStyle = "#75b96b";
        context.fillRect(0, groundY, width, height - groundY);
        context.fillStyle = "#5c9e5b";
        context.fillRect(0, groundY, width, 13);
        for (let grass = 0; grass < width + 30; grass += 35) {
            const grassX = grass - (cameraX % 35);
            context.fillStyle = grass % 2 ? "#91cf75" : "#6eaf60";
            context.fillRect(grassX, groundY + 28 + (grass % 3) * 15, 13, 5);
        }

        for (const platform of platforms) {
            const x = platform.x - cameraX;
            if (x + platform.width < -20 || x > width + 20) continue;
            context.fillStyle = "#b98356";
            roundRect(x, platform.y, platform.width, 22, 7);
            context.fill();
            context.fillStyle = "#e6b778";
            roundRect(x, platform.y, platform.width, 8, 7);
            context.fill();
            context.fillStyle = "#5e9d55";
            for (let block = 10; block < platform.width; block += 29) {
                context.fillRect(x + block, platform.y + 13, 7, 4);
            }
        }

        for (let tree = 0; tree < 10; tree += 1) {
            const treeX = 270 + tree * 260 - cameraX;
            if (treeX < -50 || treeX > width + 50) continue;
            context.fillStyle = "#8b6744";
            context.fillRect(treeX, groundY - 65, 18, 65);
            context.fillStyle = tree % 2 ? "#498d5a" : "#5c9d5b";
            context.beginPath();
            context.arc(treeX + 9, groundY - 77, 34, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = "#79b866";
            context.beginPath();
            context.arc(treeX - 10, groundY - 66, 22, 0, Math.PI * 2);
            context.fill();
        }

        drawCage(cage.x - cameraX, time);
        drawPlayer(player.x - cameraX, player.y, time);
        if (cage.openAt && time - cage.openAt >= 950) {
            drawMascot(mascot.x - cameraX, mascot.y, time);
        }
        if (active && !gameFinished) {
            for (const enemy of enemies) {
                if (!enemy.defeated) drawMiniIgnorance(enemy, cameraX, time);
            }
            drawDoor(cameraX, enemies.every((enemy) => enemy.defeated));

            if (mascot.x > cameraX - 40 && mascot.x < cameraX + width + 40) {
                context.fillStyle = "rgba(255, 254, 250, .94)";
                context.beginPath();
                context.roundRect(mascot.x - cameraX - 10, mascot.y - 28, 62, 22, 9);
                context.fill();
                context.fillStyle = "#175e49";
                context.font = "800 12px Segoe UI, sans-serif";
                context.textAlign = "center";
                context.fillText("Toque aqui", mascot.x - cameraX + 21, mascot.y - 13);
            }
        }
        return cameraX;
    };

    const update = (delta, time) => {
        if (!active) {
            if (!cutsceneStartedAt) return;
            const elapsed = time - cutsceneStartedAt;
            const approach = Math.min(1, elapsed / 850);
            player.x = 330 - 112 * approach;

            if (elapsed >= 850 && !cage.openAt) {
                cage.openAt = time;
                introTitle.textContent = "Você conseguiu!";
                introCopy.textContent = "A portinha se abriu. Seu novo amigo está livre!";
                openCageButton.textContent = "A gaiola está abrindo...";
            }

            const releaseProgress = Math.min(1, Math.max(0, (elapsed - 1800) / 420));
            if (releaseProgress > 0) {
                mascot.x = cage.x + 82 + (player.x - 58 - (cage.x + 82)) * releaseProgress;
                mascot.y = groundY - 40;
            }

            if (elapsed >= 2450 && !cutsceneFinishing) {
                cutsceneFinishing = true;
                introCard.classList.add("is-opening");
                window.setTimeout(() => {
                    introCard.hidden = true;
                    active = true;
                    openProgressButton.disabled = false;
                    gameStatus.textContent = "Clique no mascote para escolher um nível. Pressione E perto dos mini ignorâncias.";
                    showToast("A aventura começou! Clique no mascote para ver os níveis.", 3000);
                }, 380);
            }
            return;
        }
        if (activePanel) return;

        const step = Math.min(delta / 16.67, 2);
        const speed = 4.1 * step;
        const previousY = player.y;
        const movingLeft = keys.has("a");
        const movingRight = keys.has("d");

        if (movingLeft !== movingRight) {
            player.x += movingRight ? speed : -speed;
        }
        player.x = Math.max(0, Math.min(worldWidth - player.width, player.x));

        if (keys.has("w") && player.grounded && jumpReady) {
            player.velocityY = -12.8;
            player.grounded = false;
            jumpReady = false;
        }
        if (!keys.has("w")) jumpReady = true;

        const dropping = keys.has("s");
        if (dropping && player.grounded && player.y < groundY - player.height) {
            player.y += 4;
            player.grounded = false;
        }
        player.velocityY += .55 * step;
        player.y += player.velocityY * step;
        player.grounded = false;

        if (player.y + player.height >= groundY) {
            player.y = groundY - player.height;
            player.velocityY = 0;
            player.grounded = true;
        }
        if (!dropping && player.velocityY >= 0) {
            for (const platform of platforms) {
                const overlapping = player.x + player.width > platform.x && player.x < platform.x + platform.width;
                const crossedTop = previousY + player.height <= platform.y && player.y + player.height >= platform.y;
                if (overlapping && crossedTop) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.grounded = true;
                    break;
                }
            }
        }

        const followX = player.x - 58;
        const followY = player.y + player.height - 40;
        mascot.x += (followX - mascot.x) * Math.min(.13 * step, .8);
        mascot.y += (followY - mascot.y) * Math.min(.13 * step, .8);
        mascot.x = Math.max(0, mascot.x);

        const nearbyEnemy = enemies.find((enemy) =>
            !enemy.defeated && Math.abs(player.x + player.width / 2 - enemy.x) < 76);
        const nearDoor = player.x + player.width / 2 >= worldWidth - 180;
        if (nearbyEnemy) {
            gameStatus.textContent = `Mini ignorância ${nearbyEnemy.index + 1} à frente. Pressione E para iniciar a batalha!`;
        } else if (nearDoor && enemies.some((enemy) => !enemy.defeated)) {
            const remaining = enemies.filter((enemy) => !enemy.defeated).length;
            gameStatus.textContent = `A porta está fechada. Vença os ${remaining} mini ignorâncias restantes.`;
        } else if (nearDoor && !phaseCompleted) {
            gameStatus.textContent = "Todos os mini ignorâncias foram vencidos! Pressione E na porta.";
        } else if (!phaseCompleted) {
            gameStatus.textContent = "Clique no mascote para escolher um nível. Pressione E perto dos mini ignorâncias.";
        }

        if (mascot.x > cage.x + 82 && !toast.hidden) {
            toast.hidden = true;
        }
        if (toastTimer && time > toastTimer) {
            toast.hidden = true;
            toastTimer = 0;
        }
    };

    const frame = (time) => {
        const delta = lastFrame ? time - lastFrame : 16.67;
        lastFrame = time;
        update(delta, time);
        drawScene(time);
        window.requestAnimationFrame(frame);
    };

    const openCage = () => {
        if (cutsceneStartedAt) return;
        cutsceneStartedAt = performance.now();
        openCageButton.disabled = true;
        introTitle.textContent = "Vamos libertar seu amigo!";
        introCopy.textContent = "Seu personagem está abrindo caminho até a gaiola...";
        openCageButton.textContent = "Abrindo...";
    };

    const showToast = (message, duration) => {
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = performance.now() + duration;
    };

    const updateDifficultyOptions = () => {
        document.querySelectorAll("[data-difficulty]").forEach((button) => {
            const difficulty = Number(button.dataset.difficulty);
            const isUnlocked = difficulty <= unlockedDifficulty;
            button.disabled = !isUnlocked;
            const state = button.querySelector(".difficulty-state");
            state.textContent = isUnlocked ? (difficulty === currentPhase ? "Fase atual" : "Disponível") : "🔒 Bloqueado";
        });
    };

    const showPanel = (panel) => {
        difficultyPanel.hidden = panel !== difficultyPanel;
        progressPanel.hidden = panel !== progressPanel;
        progressBackdrop.hidden = panel !== progressPanel;
        quizPanel.hidden = panel !== quizPanel;
        phasePanel.hidden = panel !== phasePanel;
        activePanel = panel;
        if (panel) {
            keys.clear();
            panel.querySelector("button:not(:disabled)")?.focus();
        }
    };

    const setPhaseLabel = () => {
        const difficultyName = ["Básico", "Intermediário", "Avançado"][currentPhase];
        levelLabel.textContent = `🗺️ Fase ${currentPhase + 1} · ${difficultyName}`;
    };

    const updateProgressPanel = () => {
        const defeatedCount = enemies.filter((enemy) => enemy.defeated).length;
        const difficultyName = ["Básico", "Intermediário", "Avançado"][currentPhase];
        progressPhaseBadge.textContent = `Fase ${currentPhase + 1} · ${difficultyName}`;
        document.querySelector("#progress-title").textContent = `${subjectName} · ${difficultyName}`;
        progressCount.textContent = `${defeatedCount} de ${enemies.length} etapas`;
        progressTrack.setAttribute("aria-valuenow", String(defeatedCount));
        progressFill.style.width = `${(defeatedCount / enemies.length) * 100}%`;
        progressSteps.replaceChildren(...enemies.map((enemy, index) => {
            const completed = enemy.defeated;
            const isCurrent = !completed && !enemies.slice(0, index).some((item) => !item.defeated);
            const step = document.createElement("li");
            step.className = "progress-step";
            if (completed) step.classList.add("is-complete");
            else if (isCurrent) step.classList.add("is-current");

            const icon = document.createElement("span");
            icon.className = "progress-step-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = completed ? "✓" : isCurrent ? "◌" : "✦";

            const name = document.createElement("strong");
            name.textContent = `Desafio ${index + 1}`;

            const state = document.createElement("span");
            state.className = "progress-step-state";
            state.textContent = completed ? "Concluído" : isCurrent ? "Agora" : "A seguir";

            step.append(icon, name, state);
            return step;
        }));
    };

    const startDifficulty = (difficulty) => {
        if (difficulty > unlockedDifficulty) return;
        currentPhase = difficulty;
        phaseCompleted = false;
        gameFinished = false;
        enemies = enemyPositions.map((x, index) => ({ x, index, defeated: false }));
        enemyCountLabel.textContent = "Mini ignorâncias: 0/5";
        player.x = 220;
        player.y = groundY - player.height;
        player.velocityY = 0;
        player.grounded = true;
        mascot.x = player.x - 58;
        mascot.y = groundY - 40;
        setPhaseLabel();
        updateDifficultyOptions();
        updateProgressPanel();
        showPanel(null);
        active = true;
        openProgressButton.disabled = false;
        gameStatus.textContent = "Encontre os mini ignorâncias e pressione E para iniciar cada batalha.";
        showToast(`Fase ${currentPhase + 1}: ${["Básico", "Intermediário", "Avançado"][currentPhase]}`, 2300);
    };

    const openDifficultyPanel = () => {
        if (!active || phaseCompleted || activePanel) return;
        updateDifficultyOptions();
        showPanel(difficultyPanel);
    };

    const makeBattleQuestions = (enemy) => {
        const pool = questionBank[subjectId] || questionBank.portugues;
        const phasePool = pool.slice([0, 2, 5][currentPhase]);
        const start = (enemy.index * 2) % phasePool.length;
        return Array.from({ length: 5 }, (_, index) => {
            const [prompt, answer, ...rest] = phasePool[(start + index) % phasePool.length];
            const explanation = rest.pop();
            const options = [answer, ...rest];
            for (let option = options.length - 1; option > 0; option -= 1) {
                const swapIndex = Math.floor(Math.random() * (option + 1));
                [options[option], options[swapIndex]] = [options[swapIndex], options[option]];
            }
            return { prompt, answer, options, explanation };
        });
    };

    const showBattleQuestion = () => {
        answerLocked = false;
        quizProgress.textContent =
            `Pergunta ${questionIndex + 1} de 5 · ${correctAnswers} acertos · meta ${[3, 4, 5][currentPhase]}/5`;
        quizQuestion.textContent = battleQuestions[questionIndex].prompt;
        quizFeedback.textContent = "";
        quizFeedback.classList.remove("is-wrong");
        quizNext.hidden = true;
        quizAnswers.replaceChildren(...battleQuestions[questionIndex].options.map((option) => {
            const button = document.createElement("button");
            button.className = "quiz-answer";
            button.type = "button";
            button.textContent = option;
            button.addEventListener("click", () => {
                if (answerLocked) return;
                answerLocked = true;
                const question = battleQuestions[questionIndex];
                const isCorrect = option === question.answer;
                if (isCorrect) correctAnswers += 1;
                quizAnswers.querySelectorAll(".quiz-answer").forEach((answerButton) => {
                    answerButton.disabled = true;
                    if (answerButton.textContent === question.answer) answerButton.classList.add("is-correct");
                    else if (answerButton === button) answerButton.classList.add("is-wrong");
                });
                quizFeedback.textContent = `${isCorrect ? "Boa! " : "Quase! "}${question.explanation}`;
                quizFeedback.classList.toggle("is-wrong", !isCorrect);
                quizNext.textContent = questionIndex === 4 ? "Ver resultado" : "Próxima pergunta";
                quizNext.dataset.action = "next";
                quizNext.hidden = false;
                quizNext.focus();
            });
            return button;
        }));
    };

    const startBattle = (enemy) => {
        if (!active || activePanel || phaseCompleted) return;
        activeEnemy = enemy;
        battleQuestions = makeBattleQuestions(enemy);
        questionIndex = 0;
        correctAnswers = 0;
        quizTitle.textContent = `Mini ignorância ${enemy.index + 1}`;
        document.querySelector("#quiz-kicker").textContent =
            `${["BÁSICO", "INTERMEDIÁRIO", "AVANÇADO"][currentPhase]} · BATALHA DE IDEIAS`;
        active = false;
        showPanel(quizPanel);
        showBattleQuestion();
    };

    const completeBattle = () => {
        const requiredCorrect = [3, 4, 5][currentPhase];
        const passed = correctAnswers >= requiredCorrect;
        quizProgress.textContent = `Resultado: ${correctAnswers} de 5 respostas corretas`;
        quizQuestion.textContent = passed
            ? "Você venceu esta batalha de ideias!"
            : "Ainda não foi desta vez. Revise as explicações e tente novamente.";
        quizAnswers.replaceChildren();
        quizFeedback.textContent = passed
            ? "O mini ignorância foi vencido. Continue pela fase!"
            : `Você precisa acertar pelo menos ${requiredCorrect} perguntas para vencer.`;
        quizFeedback.classList.toggle("is-wrong", !passed);
        quizNext.textContent = passed ? "Continuar aventura" : "Tentar novamente";
        quizNext.dataset.action = passed ? "victory" : "retry";
        quizNext.hidden = false;
        quizNext.focus();
    };

    const handleQuizNext = () => {
        if (quizNext.dataset.action === "retry") {
            active = true;
            showPanel(null);
            startBattle(activeEnemy);
            return;
        }
        if (quizNext.dataset.action === "victory") {
            activeEnemy.defeated = true;
            updateProgressPanel();
            const remaining = enemies.filter((enemy) => !enemy.defeated).length;
            enemyCountLabel.textContent = `Mini ignorâncias: ${5 - remaining}/5`;
            showPanel(null);
            active = true;
            if (remaining === 0) {
                phaseCompleted = true;
                phaseCopy.textContent = currentPhase === 2
                    ? "Você venceu todos os mini ignorâncias! Pressione E para finalizar a aventura."
                    : "Todos os mini ignorâncias foram vencidos. Pressione E para avançar e desbloquear o próximo nível.";
                advancePhaseButton.textContent = currentPhase === 2
                    ? "Finalizar aventura (E)"
                    : "Avançar para a próxima fase (E)";
                gameStatus.textContent = "A porta está aberta! Vá até ela e pressione E.";
                showToast("Fase concluída! Encontre a porta no final do mundo.", 2800);
            } else {
                gameStatus.textContent = `Batalha vencida! Ainda faltam ${remaining} mini ignorâncias.`;
                showToast(`Mini ignorância vencido! Restam ${remaining}.`, 2200);
            }
            activeEnemy = null;
            return;
        }
        if (questionIndex === 4) {
            completeBattle();
            return;
        }
        questionIndex += 1;
        showBattleQuestion();
    };

    const completePhase = () => {
        if (!phaseCompleted || !enemies.every((enemy) => enemy.defeated)) return;
        if (currentPhase < 2) {
            unlockedDifficulty = Math.max(unlockedDifficulty, currentPhase + 1);
            updateDifficultyOptions();
            showPanel(null);
            startDifficulty(currentPhase + 1);
            showToast(`${["Básico", "Intermediário", "Avançado"][unlockedDifficulty]} desbloqueado!`, 3000);
            return;
        }
        gameFinished = true;
        phasePanel.querySelector(".intro-kicker").textContent = "AVENTURA CONCLUÍDA";
        document.querySelector("#phase-title").textContent = "Você venceu todos os desafios!";
        phaseCopy.textContent = "Parabéns por concluir os níveis Básico, Intermediário e Avançado.";
        advancePhaseButton.textContent = "Voltar para matérias";
        advancePhaseButton.dataset.action = "return";
        showPanel(phasePanel);
    };

    const interact = () => {
        if (!active || activePanel) return;
        const nearbyEnemy = enemies.find((enemy) =>
            !enemy.defeated && Math.abs(player.x + player.width / 2 - enemy.x) < 76);
        if (nearbyEnemy) {
            startBattle(nearbyEnemy);
            return;
        }
        if (player.x + player.width / 2 >= worldWidth - 180) {
            if (enemies.some((enemy) => !enemy.defeated)) {
                const remaining = enemies.filter((enemy) => !enemy.defeated).length;
                showToast(`A porta está fechada. Restam ${remaining} mini ignorâncias.`, 2400);
                return;
            }
            phaseCompleted = true;
            completePhase();
            return;
        }
        showToast("Chegue perto de um mini ignorância ou do mascote para interagir.", 1900);
    };

    const setKey = (key, isDown) => {
        const normalizedKey = key.toLowerCase();
        if (!["w", "a", "s", "d"].includes(normalizedKey)) return;
        if (isDown) keys.add(normalizedKey);
        else keys.delete(normalizedKey);
    };

    openCageButton.addEventListener("click", openCage);
    const openProgressButton = document.querySelector("#open-progress-button");
    openProgressButton.addEventListener("click", () => {
        if (!active || activePanel) return;
        updateProgressPanel();
        showPanel(progressPanel);
    });
    progressBackdrop.addEventListener("click", () => {
        showPanel(null);
        active = true;
        openProgressButton.focus();
    });
    document.querySelector("#open-difficulty-button").addEventListener("click", openDifficultyPanel);
    document.querySelectorAll("[data-difficulty]").forEach((button) => {
        button.addEventListener("click", () => startDifficulty(Number(button.dataset.difficulty)));
    });
    document.querySelectorAll("[data-close-panel]").forEach((button) => {
        button.addEventListener("click", () => {
            const closingProgress = activePanel === progressPanel;
            showPanel(null);
            active = true;
            if (closingProgress) openProgressButton.focus();
        });
    });
    quizNext.addEventListener("click", handleQuizNext);
    advancePhaseButton.addEventListener("click", () => {
        if (advancePhaseButton.dataset.action === "return") {
            window.location.assign("/materias.html");
            return;
        }
        completePhase();
    });
    canvas.addEventListener("click", (event) => {
        if (!active || activePanel || phaseCompleted) return;
        const bounds = canvas.getBoundingClientRect();
        const cameraX = Math.max(0, Math.min(worldWidth - canvas.width, player.x - canvas.width * .38));
        const clickX = (event.clientX - bounds.left) * canvas.width / bounds.width + cameraX;
        const clickY = (event.clientY - bounds.top) * canvas.height / bounds.height;
        if (Math.abs(clickX - (mascot.x + 20)) < 45 && Math.abs(clickY - (mascot.y + 20)) < 48) {
            openDifficultyPanel();
        }
    });
    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        if (key === "escape" && activePanel) {
            const closingProgress = activePanel === progressPanel;
            showPanel(null);
            active = true;
            if (closingProgress) openProgressButton.focus();
            return;
        }
        if (key === "e") {
            event.preventDefault();
            if (activePanel === phasePanel) {
                advancePhaseButton.click();
            } else {
                interact();
            }
            return;
        }
        if (!["w", "a", "s", "d"].includes(key)) return;
        if (active && !activePanel) {
            event.preventDefault();
            setKey(key, true);
        }
    });
    document.addEventListener("keyup", (event) => setKey(event.key, false));
    window.addEventListener("blur", () => keys.clear());
    document.querySelectorAll("[data-game-key]").forEach((button) => {
        const key = button.dataset.gameKey;
        button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            setKey(key, true);
        });
        for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
            button.addEventListener(eventName, () => setKey(key, false));
        }
    });
    document.querySelector("[data-game-action='interact']").addEventListener("click", interact);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) keys.clear();
    });

    drawScene(performance.now());
    window.requestAnimationFrame(frame);
}
