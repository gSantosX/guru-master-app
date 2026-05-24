import React, { useState, useEffect } from 'react';
import { 
  Youtube, 
  Search, 
  Globe, 
  TrendingUp, 
  Video, 
  Users, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Layers, 
  PlayCircle,
  X,
  Sparkles,
  Brain,
  History,
  ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { t } from '../utils/i18n';
import { resolveApiUrl, buildYouTubeUrl } from '../utils/apiUtils';
import { usePersistence } from '../contexts/PersistenceContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { callAI } from '../utils/aiUtils';

const NICHES = [
  "Finanças", "História", "Mistérios", "Crimes Reais", "Espiritualidade", 
  "Motivação", "Saúde", "Tecnologia", "Curiosidades", "Documentários",
  "Gameplay", "Culinária", "Viagens", "Pets", "Moda", "Educação",
  "Empreendedorismo", "Marketing Digital", "Desenvolvimento Pessoal", "Relacionamentos",
  "Filosofia", "Ciência", "Astronomia", "Fofoca e Famosos", "Resumo de Filmes",
  "Animes e Mangás", "Esportes", "Carros e Motos", "Política e Notícias",
  "Engenharia e Construção", "Artesanato e DIY", "ASMR", "Música e Covers",
  "Fotografia", "Programação", "Criptomoedas", "Sobrevivencialismo", "Jardinagem", 
  "Minimalismo", "Histórias de Terror", "Mitologia", "Casas Luxuosas", "Cultura Pop e Geek", 
  "Maternidade e Família", "Treino e Calistenia", "Histórias Bíblicas", "Assuntos Militares", 
  "Vida em Motorhome", "Aviação e Aeroespacial", "Audiobooks e Resumos", "Beleza e Maquiagem", 
  "Hardware e Setup", "Jogos Mobile", "Desenho e Arte", "Aprender Idiomas"
];

const NICHE_TRANSLATIONS = {
  "Finanças": { pt: "Finanças", en: "Finance", es: "Finanzas", fr: "Finances", de: "Finanzen", it: "Finanza", hi: "वित", ja: "金融" },
  "História": { pt: "História", en: "History", es: "Historia", fr: "Histoire", de: "Geschichte", it: "Storia", hi: "इतिहास", ja: "歴史" },
  "Mistérios": { pt: "Mistérios", en: "Mysteries", es: "Misterios", fr: "Mystères", de: "Mysterien", it: "Misteri", hi: "रहस्य", ja: "ミステリー" },
  "Crimes Reais": { pt: "Crimes Reais", en: "True Crime", es: "Crímenes Reales", fr: "Crimes réels", de: "Wahre Verbrechen", it: "Veri Crimini", hi: "वास्तविक अपराध", ja: "実録犯罪" },
  "Espiritualidade": { pt: "Espiritualidade", en: "Spirituality", es: "Espiritualidad", fr: "Spiritualité", de: "Spiritualität", it: "Spiritualità", hi: "आध्यात्मिकता", ja: "スパイチュリティ" },
  "Motivação": { pt: "Motivação", en: "Motivation", es: "Motivación", fr: "Motivation", de: "Motivation", it: "Motivazione", hi: "प्रेरणा", ja: "モチベーション" },
  "Saúde": { pt: "Saúde", en: "Health", es: "Salud", fr: "Santé", de: "Gesundheit", it: "Salute", hi: "स्वास्थ्य", ja: "健康" },
  "Tecnologia": { pt: "Tecnologia", en: "Technology", es: "Tecnología", fr: "Technologie", de: "Technologie", it: "Tecnologia", hi: "तकनीक", ja: "テクノロジー" },
  "Curiosidades": { pt: "Curiosidades", en: "Curiosities", es: "Curiosidades", fr: "Curiosités", de: "Kuriositäten", it: "Curiosità", hi: "जिज्ञासा", ja: "好奇心" },
  "Documentários": { pt: "Documentários", en: "Documentaries", es: "Documentales", fr: "Documentaires", de: "Dokumentarfilme", it: "Documentari", hi: "वृत्तचित्र", ja: "ドキュメンタリー" },
  "Gameplay": { pt: "Gameplay", en: "Gameplay", es: "Gameplay", fr: "Gameplay", de: "Gameplay", it: "Gameplay", hi: "गेमप्ले", ja: "ゲームプレイ" },
  "Culinária": { pt: "Culinária", en: "Cooking", es: "Cocina", fr: "Cuisine", de: "Kochen", it: "Cucina", hi: "पाक कला", ja: "料理" },
  "Viagens": { pt: "Viagens", en: "Travel", es: "Viajes", fr: "Voyage", de: "Reisen", it: "Viaggi", hi: "यात्रा", ja: "旅行" },
  "Pets": { pt: "Pets", en: "Pets", es: "Mascotas", fr: "Animaux", de: "Haustiere", it: "Animali", hi: "पालतू जानवर", ja: "ペット" },
  "Moda": { pt: "Moda", en: "Fashion", es: "Moda", fr: "Mode", de: "Mode", it: "Moda", hi: "फैशन", ja: "ファッション" },
  "Educação": { pt: "Educação", en: "Education", es: "Educación", fr: "Éducation", de: "Bildung", it: "Educazione", hi: "शिक्षा", ja: "教育" },
  "Empreendedorismo": { pt: "Empreendedorismo", en: "Entrepreneurship", es: "Emprendimiento", fr: "Entrepreneuriat", de: "Unternehmertum", it: "Imprenditoria", hi: "उद्यमिता", ja: "起業家精神" },
  "Marketing Digital": { pt: "Marketing Digital", en: "Digital Marketing", es: "Marketing Digital", fr: "Marketing Numérique", de: "Digitales Marketing", it: "Marketing Digitale", hi: "डिजिटल मार्केटिंग", ja: "デジタルマーケティング" },
  "Desenvolvimento Pessoal": { pt: "Desenvolvimento Pessoal", en: "Personal Development", es: "Desarrollo Personal", fr: "Développement Personnel", de: "Persönlichkeitsentwicklung", it: "Sviluppo Personale", hi: "व्यक्तिगत विकास", ja: "自己啓発" },
  "Relacionamentos": { pt: "Relacionamentos", en: "Relationships", es: "Relaciones", fr: "Relations", de: "Beziehungen", it: "Relazioni", hi: "रिश्ते", ja: "人間関係" },
  "Filosofia": { pt: "Filosofia", en: "Philosophy", es: "Filosofía", fr: "Philosophie", de: "Philosophie", it: "Filosofia", hi: "दर्शन", ja: "哲学" },
  "Ciência": { pt: "Ciência", en: "Science", es: "Ciencia", fr: "Science", de: "Wissenschaft", it: "Scienza", hi: "विज्ञान", ja: "科学" },
  "Astronomia": { pt: "Astronomia", en: "Astronomy", es: "Astronomía", fr: "Astronomie", de: "Astronomie", it: "Astronomia", hi: "खगोल विज्ञान", ja: "天文学" },
  "Fofoca e Famosos": { pt: "Fofoca e Famosos", en: "Celebrity Gossip", es: "Chismes de Famosos", fr: "Potins de Célébrités", de: "Promi-Tratsch", it: "Gossip", hi: "सेलिब्रिटी गपशप", ja: "有名人のゴシップ" },
  "Resumo de Filmes": { pt: "Resumo de Filmes", en: "Movie Recaps", es: "Resumen de Películas", fr: "Résumés de Films", de: "Filmzusammenfassungen", it: "Riassunti di Film", hi: "मूवी रिकैप", ja: "映画の要約" },
  "Animes e Mangás": { pt: "Animes e Mangás", en: "Anime and Manga", es: "Anime y Manga", fr: "Anime et Manga", de: "Anime und Manga", it: "Anime e Manga", hi: "एनीमे और मंगा", ja: "アニメと漫画" },
  "Esportes": { pt: "Esportes", en: "Sports", es: "Deportes", fr: "Sports", de: "Sport", it: "Sport", hi: "खेल", ja: "スポーツ" },
  "Carros e Motos": { pt: "Carros e Motos", en: "Cars and Motorcycles", es: "Coches y Motos", fr: "Voitures et Motos", de: "Autos und Motorräder", it: "Auto e Moto", hi: "कारें और मोटरसाइकिलें", ja: "車とバイク" },
  "Política e Notícias": { pt: "Política e Notícias", en: "Politics and News", es: "Política y Noticias", fr: "Politique et Nouvelles", de: "Politik und Nachrichten", it: "Politica e Notizie", hi: "राजनीति और समाचार", ja: "政治とニュース" },
  "Engenharia e Construção": { pt: "Engenharia e Construção", en: "Engineering and Construction", es: "Ingeniería y Construcción", fr: "Ingénierie et Construction", de: "Ingenieurwesen", it: "Ingegneria e Costruzioni", hi: "इंजीनियरिंग और निर्माण", ja: "エンジニアリングと建設" },
  "Artesanato e DIY": { pt: "Artesanato e DIY", en: "Crafts and DIY", es: "Manualidades y Bricolaje", fr: "Artisanat et Bricolage", de: "Basteln und DIY", it: "Artigianato e Fai da Te", hi: "शिल्प और DIY", ja: "工芸品とDIY" },
  "ASMR": { pt: "ASMR", en: "ASMR", es: "ASMR", fr: "ASMR", de: "ASMR", it: "ASMR", hi: "ASMR", ja: "ASMR" },
  "Música e Covers": { pt: "Música e Covers", en: "Music and Covers", es: "Música y Covers", fr: "Musique et Reprises", de: "Musik und Cover", it: "Musica e Cover", hi: "संगीत और कवर", ja: "音楽とカバー" },
  "Fotografia": { pt: "Fotografia", en: "Photography", es: "Fotografía", fr: "Photographie", de: "Fotografie", it: "Fotografia", hi: "फोटोग्राफी", ja: "写真" },
  "Programação": { pt: "Programação", en: "Programming", es: "Programación", fr: "Programmation", de: "Programmierung", it: "Programmazione", hi: "प्रोग्रामिंग", ja: "プログラミング" },
  "Criptomoedas": { pt: "Criptomoedas", en: "Cryptocurrency", es: "Criptomonedas", fr: "Cryptomonnaie", de: "Kryptowährung", it: "Criptovaluta", hi: "क्रिप्टोकरंसी", ja: "暗号通貨" },
  "Sobrevivencialismo": { pt: "Sobrevivencialismo", en: "Survivalism", es: "Supervivencia", fr: "Survivalisme", de: "Survivalismus", it: "Sopravvivenza", hi: "जीवन रक्षा", ja: "サバイバル" },
  "Jardinagem": { pt: "Jardinagem", en: "Gardening", es: "Jardinería", fr: "Jardinage", de: "Gartenarbeit", it: "Giardinaggio", hi: "बागवानी", ja: "ガーデニング" },
  "Minimalismo": { pt: "Minimalismo", en: "Minimalism", es: "Minimalismo", fr: "Minimalisme", de: "Minimalismus", it: "Minimalismo", hi: "अतिवाद", ja: "ミニマリズム" },
  "Histórias de Terror": { pt: "Histórias de Terror", en: "Horror Stories", es: "Historias de Terror", fr: "Histoires d'horreur", de: "Horror Geschichten", it: "Storie dell'Orrore", hi: "डरावनी कहानियाँ", ja: "ホラー話" },
  "Mitologia": { pt: "Mitologia", en: "Mythology", es: "Mitología", fr: "Mythologie", de: "Mythologie", it: "Mitologia", hi: "पौराणिक कथाएं", ja: "神話" },
  "Casas Luxuosas": { pt: "Casas Luxuosas", en: "Luxury Homes", es: "Casas de Lujo", fr: "Maisons de luxe", de: "Luxushäuser", it: "Case di Lusso", hi: "लक्जरी घर", ja: "高級住宅" },
  "Cultura Pop e Geek": { pt: "Cultura Pop e Geek", en: "Pop Culture and Geek", es: "Cultura Pop y Geek", fr: "Culture Pop et Geek", de: "Popkultur und Geek", it: "Cultura Pop e Geek", hi: "पॉप संस्कृति और गीक", ja: "ポップカルチャーとギーク" },
  "Maternidade e Família": { pt: "Maternidade e Família", en: "Parenting and Family", es: "Maternidad y Familia", fr: "Parentalité et Famille", de: "Elternschaft und Familie", it: "Genitorialità e Famiglia", hi: "पालन-पोषण और परिवार", ja: "子育てと家族" },
  "Treino e Calistenia": { pt: "Treino e Calistenia", en: "Fitness and Calisthenics", es: "Fitness y Calistenia", fr: "Fitness et Callisthénie", de: "Fitness und Calisthenics", it: "Fitness e Calistenia", hi: "फिटनेस और कैलिस्थेनिक्स", ja: "フィットネスとカリステニクス" },
  "Histórias Bíblicas": { pt: "Histórias Bíblicas", en: "Bible Stories", es: "Historias Bíblicas", fr: "Histoires bibliques", de: "Bibelgeschichten", it: "Storie della Bibbia", hi: "बाइबिल की कहानियाँ", ja: "聖書の話" },
  "Assuntos Militares": { pt: "Assuntos Militares", en: "Military and Defense", es: "Asuntos Militares", fr: "Affaires militaires", de: "Militär und Verteidigung", it: "Affari Militari", hi: "सैन्य और रक्षा", ja: "軍事と防衛" },
  "Vida em Motorhome": { pt: "Vida em Motorhome", en: "RV Life", es: "Vida em Motorhome", fr: "Vie en camping-car", de: "Wohnmobil Leben", it: "Vita in Camper", hi: "आरवी लाइफ", ja: "キャンピングカーライフ" },
  "Aviação e Aeroespacial": { pt: "Aviação e Aeroespacial", en: "Aviation and Aerospace", es: "Aviación y Aeroespacial", fr: "Aviation et Aérospatiale", de: "Luftfahrt und Raumfahrt", it: "Aviazione e Aerospazio", hi: "विमानन और एयरोस्पेस", ja: "航空宇宙" },
  "Audiobooks e Resumos": { pt: "Audiobooks e Resumos", en: "Audiobooks and Book Summaries", es: "Audiolibros y Resúmenes", fr: "Livres audio et Résumés", de: "Hörbücher und Zusammenfassungen", it: "Audiolibri e Riassunti", hi: "ऑडियोबुक और सारांश", ja: "オーディオブックと要約" },
  "Beleza e Maquiagem": { pt: "Beleza e Maquiagem", en: "Beauty and Makeup", es: "Belleza y Maquillaje", fr: "Beauté et Maquillage", de: "Schönheit und Make-up", it: "Bellezza e Trucco", hi: "सौندर्य और मेकअप", ja: "美容とメイク" },
  "Hardware e Setup": { pt: "Hardware e Setup", en: "PC Hardware and Setups", es: "Hardware y Setups de PC", fr: "Matériel PC et configurations", de: "PC-Hardware und Setups", it: "Hardware e Setup PC", hi: "पीसी हार्डवेयर और सेटअप", ja: "PCハードウェアとセットアップ" },
  "Jogos Mobile": { pt: "Jogos Mobile", en: "Mobile Gaming", es: "Juegos Móviles", fr: "Jeux Mobiles", de: "Mobile Gaming", it: "Giochi per Cellulare", hi: "मोबाइल गेमिंग", ja: "モバイルゲーム" },
  "Desenho e Arte": { pt: "Desenho e Arte", en: "Drawing and Art", es: "Dibujo y Arte", fr: "Dessin et Art", de: "Zeichnen und Kunst", it: "Disegno e Arte", hi: "ड्राइング और आर्ट", ja: "お絵かきとアート" },
  "Aprender Idiomas": { pt: "Aprender Idiomas", en: "Language Learning", es: "Aprender Idiomas", fr: "Apprentissage des langues", de: "Sprachen lernen", it: "Imparare le Lingue", hi: "भाषा सीखना", ja: "語学学習" }
};

const NICHE_QUERIES = {
  "Finanças": {
    pt: '"educação financeira" OR "como investir" OR "finanças pessoais" OR "bolsa de valores"',
    en: '"personal finance" OR "how to invest" OR "investing for beginners" OR "financial independence"',
    es: '"educación financiera" OR "cómo invertir" OR "finanzas personales" OR "bolsa de valores"',
    fr: '"finances personnelles" OR "comment investir" OR "éducation financière"',
    de: '"finanzielle bildung" OR "wie investieren" OR "persönliche finanzen"',
    it: '"finanza personale" OR "come investire" OR "educazione finanziaria"',
    hi: '"निवेश कैसे करें" OR "व्यक्तिगत वित्त" OR "पैसे कैसे बचाएं"',
    ja: '"個人財務" OR "投資方法" OR "資産運用" OR "マネーリテラシー"'
  },
  "História": {
    pt: '"história antiga" OR "curiosidades históricas" OR "história do mundo" OR "grandes impérios"',
    en: '"ancient history" OR "historical facts" OR "world history" OR "documentary history"',
    es: '"historia antigua" OR "curiosidades históricas" OR "historia del mundo" OR "grandes imperios"',
    fr: '"histoire ancienne" OR "faits historiques" OR "histoire du monde"',
    de: '"antike geschichte" OR "historische fakten" OR "weltgeschichte"',
    it: '"storia antica" OR "curiosità storiche" OR "storia del mondo"',
    hi: '"प्राचीन इतिहास" OR "ऐतिहासिक तथ्य" OR "विश्व इतिहास"',
    ja: '"古代史" OR "歴史的雑学" OR "世界史" OR "歴史ドキュメンタリー"'
  },
  "Mistérios": {
    pt: '"mistérios não resolvidos" OR "casos misteriosos" OR "enigmas da humanidade" OR "fenômenos inexplicáveis"',
    en: '"unsolved mysteries" OR "mysterious cases" OR "unexplained phenomena" OR "dark mysteries"',
    es: '"misterios sin resolver" OR "casos misteriosos" OR "fenómenos inexplicables"',
    fr: '"mystères non résolus" OR "cas mystérieux" OR "phénomènes inexpliqués"',
    de: '"ungelöste rätsel" OR "mysteriöse fälle" OR "unerklärliche phänomene"',
    it: '"misteri irrisolti" OR "casi misteriosi" OR "fenomeni inspiegabili"',
    hi: '"अनसुने रहस्य" OR "रहस्यमयी घटनाएँ" OR "अद्भुत रहस्य"',
    ja: '"未解決事件" OR "世界のミステリー" OR "不思議な現象"'
  },
  "Crimes Reais": {
    pt: '"crimes reais" OR "casos criminais" OR "documentário de crime" OR "true crime brasil"',
    en: '"true crime" OR "criminal cases" OR "crime documentary" OR "serial killer story"',
    es: '"crímenes reales" OR "casos criminales" OR "documental de crimen"',
    fr: '"crime réel" OR "affaires criminelles" OR "documentaire criminel"',
    de: '"wahre verbrechen" OR "kriminalfälle" OR "true crime deutsch"',
    it: '"veri crimini" OR "casi criminali" OR "documentario criminale"',
    hi: '"वास्तविक अपराध" OR "आपराधिक मामले" OR "क्राइम स्टोरी"',
    ja: '"実録犯罪" OR "実際の事件" OR "犯罪ドキュメンタリー"'
  },
  "Espiritualidade": {
    pt: '"despertar espiritual" OR "leis do universo" OR "espiritualidade explicada" OR "lei da atração"',
    en: '"spiritual awakening" OR "laws of the universe" OR "spirituality explained" OR "law of attraction"',
    es: '"despertar espiritual" OR "leyes del universo" OR "ley de atracción"',
    fr: '"éveil spirituel" OR "loi de l\'attraction" OR "spiritualité"',
    de: '"spirituelles erwachen" OR "gesetz der anziehung" OR "spiritualität"',
    it: '"risveglio spirituale" OR "legge dell\'attrazione" OR "spiritualità"',
    hi: '"आध्यात्मिक जागृति" OR "आकर्षण का नियम" OR "आध्यात्मिकता"',
    ja: '"スピリチュアルな目覚め" OR "引き寄せの法則" OR "宇宙の法則"'
  },
  "Motivação": {
    pt: '"vídeo motivacional" OR "discurso motivacional" OR "motivação para vencer" OR "mentalidade de sucesso"',
    en: '"motivational video" OR "motivational speech" OR "success mindset" OR "discipline video"',
    es: '"video motivacional" OR "discurso motivacional" OR "mentalidad de éxito"',
    fr: '"vidéo de motivation" OR "discours de motivation" OR "mentalité de succès"',
    de: '"motivationsvideo" OR "motivationsrede" OR "erfolgsmindset"',
    it: '"video motivazionale" OR "discorso motivazionale" OR "mentalità di successo"',
    hi: '"प्रेरणादायक वीडियो" OR "सफलता की मानसिकता" OR "अनुशासन"',
    ja: '"モチベーション動画" OR "成功のマインドセット" OR "自己啓発スピーチ"'
  },
  "Saúde": {
    pt: '"hábitos saudáveis" OR "longevidade" OR "dicas de saúde" OR "alimentação saudável"',
    en: '"healthy habits" OR "longevity tips" OR "health tips" OR "clean eating"',
    es: '"hábitos saludables" OR "consejos de salud" OR "alimentación sana"',
    fr: '"habitudes saines" OR "conseils de santé" OR "alimentation équilibrée"',
    de: '"gesunde gewohnheiten" OR "gesundheitstipps" OR "gesunde ernährung"',
    it: '"abitudini sane" OR "consigli di salute" OR "alimentazione sana"',
    hi: '"स्वस्थ आदतें" OR "स्वास्थ्य युक्तियाँ" OR "पौष्टिक आहार"',
    ja: '"健康的な習慣" OR "健康のヒント" OR "食生活の改善"'
  },
  "Tecnologia": {
    pt: '"novas tecnologias" OR "futuro da tecnologia" OR "gadgets inovadores" OR "revolução tech"',
    en: '"future technology" OR "tech news" OR "cool gadgets" OR "tech revolution"',
    es: '"nuevas tecnologías" OR "noticias de tecnología" OR "gadgets tecnológicos"',
    fr: '"nouvelles technologies" OR "actualité tech" OR "gadgets innovants"',
    de: '"zukunftstechnologie" OR "tech news deutsch" OR "innovative gadgets"',
    it: '"nuove tecnologie" OR "novità tecnologiche" OR "gadget tecnologici"',
    hi: '"नई तकनीक" OR "तकनीक समाचार" OR "भविष्य की तकनीक"',
    ja: '"最新テクノロジー" OR "未来の技術" OR "便利なガジェット"'
  },
  "Curiosidades": {
    pt: '"curiosidades do mundo" OR "fatos interessantes" OR "coisas que você não sabia" OR "fatos curiosos"',
    en: '"interesting facts" OR "curious facts" OR "things you didn\'t know" OR "amazing trivia"',
    es: '"datos curiosos" OR "curiosidades del mundo" OR "cosas que no sabías"',
    fr: '"faits intéressants" OR "curiosités du monde" OR "choses que vous ne saviez pas"',
    de: '"interessante fakten" OR "kuriositäten" OR "dinge die du nicht wusstest"',
    it: '"curiosità dal mondo" OR "fatti interessanti" OR "cose che non sapevi"',
    hi: '"दिलचस्प तथ्य" OR "रोचक तथ्य" OR "अद्भुत बातें"',
    ja: '"面白い雑学" OR "世界の不思議" OR "知られていない事実"'
  },
  "Documentários": {
    pt: '"documentário completo" OR "mini documentário" OR "documentário dublado" OR "história real documentário"',
    en: '"mini documentary" OR "short documentary" OR "full documentary" OR "investigative documentary"',
    es: '"documental completo" OR "mini documental" OR "documental en español"',
    fr: '"mini documentaire" OR "documentaire complet" OR "reportage complet"',
    de: '"mini dokumentation" OR "kurzdoku" OR "dokumentation deutsch"',
    it: '"mini documentario" OR "documentario completo" OR "reportage"',
    hi: '"लघु वृत्तचित्र" OR "पूरा वृत्तचित्र" OR "खोजपरक वृत्तचित्र"',
    ja: '"ミニドキュメンタリー" OR "短編ドキュメンタリー" OR "ドキュメンタリー映画"'
  },
  "Gameplay": {
    pt: '"gameplay sem comentário" OR "detonado completo" OR "gameplay pt br" OR "passo a passo jogo"',
    en: '"no commentary gameplay" OR "full walkthrough" OR "let\'s play" OR "game walkthrough"',
    es: '"gameplay sin comentarios" OR "walkthrough completo" OR "let\'s play español"',
    fr: '"gameplay sans commentaire" OR "walkthrough complet" OR "let\'s play français"',
    de: '"gameplay ohne kommentar" OR "walkthrough deutsch" OR "let\'s play deutsch"',
    it: '"gameplay senza commento" OR "walkthrough completo" OR "let\'s play italiano"',
    hi: '"बिना कमेंट्री गेमप्ले" OR "गेम वॉकथ्रू" OR "लेट्स प्ले"',
    ja: '"実況なしプレイ" OR "ゲーム攻略" OR "フルウォークスルー"'
  },
  "Culinária": {
    pt: '"receitas fáceis" OR "como cozinhar" OR "segredos da culinária" OR "culinária rápida"',
    en: '"easy recipes" OR "cooking guide" OR "how to cook" OR "tasty recipes"',
    es: '"recetas fáciles" OR "cómo cocinar" OR "cocina rápida y fácil"',
    fr: '"recettes faciles" OR "comment cuisiner" OR "cuisine rapide"',
    de: '"einfache rezepte" OR "kochen für anfänger" OR "schnelle küche"',
    it: '"ricette facili" OR "come cucinare" OR "cucina veloce"',
    hi: '"आसान रेसिपी" OR "खाना कैसे बनाएं" OR "स्वादिष्ट व्यंजन"',
    ja: '"簡単なレシピ" OR "料理の基本" OR "時短料理"'
  },
  "Viagens": {
    pt: '"guia de viagem" OR "melhores destinos" OR "diário de viagem" OR "viajar barato"',
    en: '"travel guide" OR "best destinations" OR "travel vlog" OR "budget travel"',
    es: '"guía de viaje" OR "mejores destinos" OR "viajar barato"',
    fr: '"guide de voyage" OR "meilleures destinations" OR "voyage pas cher"',
    de: '"reiseführer" OR "beste reiseziele" OR "günstig reisen"',
    it: '"guida di viaggio" OR "migliori destinazioni" OR "viaggiare low cost"',
    hi: '"यात्रा guia" OR "सर्वोत्तम स्थान" OR "सस्ती यात्रा"',
    ja: '"旅行ガイド" OR "おすすめの観光地" OR "格安旅行"'
  },
  "Pets": {
    pt: '"comportamento de cães" OR "cuidados com gatos" OR "dicas de pets" OR "treinar cachorro"',
    en: '"dog training" OR "cat care" OR "pet tips" OR "dog behavior"',
    es: '"entrenamiento de perros" OR "cuidado de gatos" OR "consejos para mascotas"',
    fr: '"éducation canine" OR "soins pour chats" OR "conseils animaux"',
    de: '"hundetraining" OR "katzenpflege" OR "haustiertipps"',
    it: '"addestramento cani" OR "cura dei gatti" OR "consigli animali"',
    hi: '"कुत्ते का प्रशिक्षण" OR "बिल्ली की देखभाल" OR "पालतू जानवरों की देखभाल"',
    ja: '"犬のしつけ" OR "猫の飼い方" OR "ペットの豆知識"'
  },
  "Moda": {
    pt: '"tendências de moda" OR "ideias de looks" OR "estilo masculino" OR "estilo feminino"',
    en: '"fashion trends" OR "outfit ideas" OR "style guide" OR "how to dress"',
    es: '"tendencias de moda" OR "ideas de outfits" OR "guía de estilo"',
    fr: '"tendances mode" OR "idées de tenues" OR "conseils style"',
    de: '"modetrends" OR "outfit ideen" OR "stilratgeber"',
    it: '"tendenze moda" OR "idee outfit" OR "guida di stile"',
    hi: '"फैशन ट्रेंड" OR "आउटफिट विचार" OR "स्टाइल गाइड"',
    ja: '"ファッションのトレンド" OR "コーディネート" OR "着こなし方"'
  },
  "Educação": {
    pt: '"resumo escolar" OR "matéria explicada" OR "métodos de estudo" OR "aula de história"',
    en: '"educational video" OR "study tips" OR "explained science" OR "crash course"',
    es: '"explicación educativa" OR "métodos de estudo" OR "clase interactiva"',
    fr: '"vidéo éducative" OR "méthodes d\'apprentissage" OR "cours complet"',
    de: '"lernmethoden" OR "erklärvideo" OR "nachhilfe deutsch"',
    it: '"video educativo" OR "metodo di studio" OR "lezione spiegata"',
    hi: '"शैक्षणिक वीडियो" OR "पढ़ाई के तरीके" OR "सरल व्याख्या"',
    ja: '"勉強のやり方" OR "教育用動画" OR "分かりやすい解説"'
  },
  "Empreendedorismo": {
    pt: '"ideias de negócios" OR "como abrir empresa" OR "dicas de empreendedorismo" OR "modelo de negócios"',
    en: '"business ideas" OR "how to start a business" OR "entrepreneur tips" OR "startup growth"',
    es: '"ideas de negocios" OR "cómo emprender" OR "consejos de negocios"',
    fr: '"idées de business" OR "créer son entreprise" OR "conseils entrepreneuriat"',
    de: '"geschäftsideen" OR "unternehmen gründen" OR "unternehmer tipps"',
    it: '"idee di business" OR "come avviare un\'impresa" OR "consigli imprenditori"',
    hi: '"बिजनेस आइडिया" OR "नया व्यापार कैसे शुरू करें" OR "उद्यमिता"',
    ja: '"起業のアイデア" OR "会社の作り方" OR "スタートアップ"'
  },
  "Marketing Digital": {
    pt: '"marketing de afiliados" OR "tráfego pago" OR "como vender na internet" OR "marketing digital do zero"',
    en: '"digital marketing for beginners" OR "affiliate marketing" OR "paid traffic" OR "seo strategies"',
    es: '"marketing de afiliados" OR "tráfico pago" OR "marketing digital desde cero"',
    fr: '"marketing d\'affiliation" OR "trafic payant" OR "marketing digital débutant"',
    de: '"affiliate marketing deutsch" OR "bezahlter traffic" OR "digitales marketing"',
    it: '"marketing di affiliazione" OR "traffico a pagamento" OR "marketing digitale"',
    hi: '"डिजिटल मार्केटिंग" OR "एफिलिएट मार्केटिंग" OR "online पैसे कमाएं"',
    ja: '"デジタルマーケティング" OR "アフィリエイト" OR "ネットビジネス"'
  },
  "Desenvolvimento Pessoal": {
    pt: '"hábitos atômicos" OR "rotina matinal" OR "desenvolvimento pessoal" OR "produtividade extrema"',
    en: '"atomic habits" OR "morning routine" OR "personal development" OR "extreme productivity"',
    es: '"hábitos atómicos" OR "rutina de mañana" OR "desarrollo personal"',
    fr: '"habitudes atomiques" OR "routine matinale" OR "développement personnel"',
    de: '"atomare gewohnheiten" OR "morgenroutine" OR "persönliche weiterentwicklung"',
    it: '"abitudini atomiche" OR "routine mattutina" OR "crescita personale"',
    hi: '"व्यक्तिगत विकास" OR "सुबह की दिनचर्या" OR "सकारात्मक आदतें"',
    ja: '"自己啓発" OR "朝のルーティン" OR "生産性の向上"'
  },
  "Relacionamentos": {
    pt: '"psicologia do amor" OR "linguagem corporal" OR "conselhos de relacionamento" OR "atração humana"',
    en: '"relationship advice" OR "body language signs" OR "love psychology" OR "relationship guide"',
    es: '"consejos de pareja" OR "lenguaje corporal" OR "psicología del amor"',
    fr: '"conseils de couple" OR "langage corporel" OR "psychologie amoureuse"',
    de: '"beziehungsratgeber" OR "körpersprache deuten" OR "liebespsychologie"',
    it: '"consigli di coppia" OR "linguaggio del corpo" OR "psicologia dell\'amore"',
    hi: '"रिश्तों की सलाह" OR "शारीरिक हाव-भाव" OR "प्यार का मनोविज्ञान"',
    ja: '"恋愛心理学" OR "人間関係の悩み" OR "ボディランゲージ"'
  },
  "Filosofia": {
    pt: '"estoicismo prático" OR "filosofia de vida" OR "grandes filósofos" OR "nietzsche explicado"',
    en: '"practical stoicism" OR "philosophy of life" OR "great philosophers" OR "stoic mindset"',
    es: '"estoicismo práctico" OR "filosofía de vida" OR "grandes filósofos"',
    fr: '"stoïcisme pratique" OR "philosophie de vie" OR "grands philosophes"',
    de: '"praktischer stoizismus" OR "philosophie des lebens" OR "große philosophen"',
    it: '"stoicismo pratico" OR "filosofia di vita" OR "grandi filosofi"',
    hi: '"व्यावहारिक स्टोइसिज्म" OR "जीवन दर्शन" OR "महान दार्शनिक"',
    ja: '"実用的ストア哲学" OR "人生の哲学" OR "ニーチェの教え"'
  },
  "Ciência": {
    pt: '"ciência explicada" OR "experimentos científicos" OR "segredos do cérebro" OR "curiosidades científicas"',
    en: '"science explained" OR "cool science experiments" OR "mysteries of the brain" OR "scientific facts"',
    es: '"ciencia explicada" OR "experimentos científicos" OR "datos científicos"',
    fr: '"science expliquée" OR "expériences scientifiques" OR "mystères du cerveau"',
    de: '"wissenschaft erklärt" OR "wissenschaftliche experimente" OR "geheimnisse des gehirns"',
    it: '"scienza spiegata" OR "esperimenti scientifici" OR "misteri del cervello"',
    hi: '"विज्ञान की बातें" OR "वैज्ञानिक प्रयोग" OR "वैज्ञानिक तथ्य"',
    ja: '"科学の不思議" OR "科学実験" OR "脳の仕組み"'
  },
  "Astronomia": {
    pt: '"buraco negro" OR "segredos do universo" OR "viagem espacial" OR "planetas misteriosos"',
    en: '"black holes" OR "mysteries of the universe" OR "space travel" OR "astrophysics documentary"',
    es: '"agujeros negros" OR "misterios del universo" OR "viaje espacial"',
    fr: '"trous noirs" OR "mystères de l\'univers" OR "voyage spatial"',
    de: '"schwarze löcher" OR "geheimnisse des universums" OR "weltraumreise"',
    it: '"buchi neri" OR "misteri dell\'universo" OR "viaggi spaziali"',
    hi: '"ब्लैक होल" OR "ब्रह्मांड के रहस्य" OR "अंतरिक्ष यात्रा"',
    ja: '"ブラックホール" OR "宇宙の謎" OR "天体観測"'
  },
  "Fofoca e Famosos": {
    pt: '"fofocas de famosos" OR "bastidores das celebridades" OR "polêmicas dos famosos" OR "vida das estrelas"',
    en: '"celebrity gossip" OR "celebrity secrets" OR "celeb drama" OR "behind the scenes Hollywood"',
    es: '"chismes de famosos" OR "secretos de celebridades" OR "polémicas de famosos"',
    fr: '"potins de célébrités" OR "secrets de stars" OR "drama célébrités"',
    de: '"promi tratsch" OR "promi geheimnisse" OR "stars und sternchen"',
    it: '"gossip celebrità" OR "dietro le quinte vip" OR "pettegolezzi famosi"',
    hi: '"सेलिब्रिटी गपशप" OR "सेलिब्रिटी के रहस्य" OR "बॉलीवुड न्यूज"',
    ja: '"芸能人のゴシップ" OR "海外セレブの噂" OR "エンタメニュース"'
  },
  "Resumo de Filmes": {
    pt: '"recapitulando filmes" OR "resumo de filme completo" OR "filme explicado" OR "resumos rápidos"',
    en: '"movie recap" OR "movie plot summary" OR "movie explained" OR "film recap"',
    es: '"resumen de películas" OR "película explicada" OR "recapitulando película"',
    fr: '"résumé de film" OR "film expliqué" OR "récapitulatif de film"',
    de: '"filmzusammenfassung" OR "film erklärt" OR "kino recap"',
    it: '"riassunto film completo" OR "film spiegato" OR "recap film"',
    hi: '"मूवी रिकैप" OR "film का सारांश" OR "मूवी एक्सप्लेन"',
    ja: '"映画の要約" OR "映画の解説" OR "ファスト映画"'
  },
  "Animes e Mangás": {
    pt: '"história de anime" OR "resumo de anime" OR "animes da temporada" OR "teorias de anime"',
    en: '"anime recap" OR "anime summary" OR "seasonal anime" OR "anime theories"',
    es: '"resumen de anime" OR "anime explicado" OR "teorías de anime"',
    fr: '"résumé d\'anime" OR "anime expliqué" OR "théories anime"',
    de: '"anime zusammenfassung" OR "anime erklärt" OR "anime theorien"',
    it: '"riassunto anime" OR "anime spiegato" OR "teorie anime"',
    hi: '"एनीमे रिकैप" OR "एनीमे का सारांश" OR "एनीमे न्यूज"',
    ja: '"アニメの要約" OR "アニメ解説" OR "アニメ考察"'
  },
  "Esportes": {
    pt: '"momentos históricos esporte" OR "análise tática" OR "documentário esportivo" OR "curiosidades esportivas"',
    en: '"historic sport moments" OR "tactical analysis sport" OR "sports documentary" OR "sports trivia"',
    es: '"momentos históricos deportes" OR "análisis táctico deportivo" OR "documental deportivo"',
    fr: '"moments historiques sport" OR "analyse tactique sport" OR "documentaire sportif"',
    de: '"historische sportmomente" OR "taktische analyse sport" OR "sport dokumentation"',
    it: '"momenti storici sport" OR "analisi tattica sport" OR "documentario sportivo"',
    hi: '"खेल के ऐतिहासिक पल" OR "खेल विश्लेषण" OR "खेल वृत्तचित्र"',
    ja: '"慢性的スポーツの瞬間" OR "スポーツ戦術解説" OR "アスリートの歴史"'
  },
  "Carros e Motos": {
    pt: '"avaliação de carros" OR "superesportivos" OR "restauração de carros" OR "curiosidades automotivas"',
    en: '"car review" OR "supercars documentary" OR "car restoration" OR "automotive trivia"',
    es: '"reseña de autos" OR "superdeportivos" OR "restauración de coches"',
    fr: '"essai auto" OR "supercars" OR "restauration de voiture"',
    de: '"autotest" OR "supercars doku" OR "auto restaurierung"',
    it: '"recensione auto" OR "supercar" OR "restauro auto"',
    hi: '"कार समीक्षा" OR "सुपरकारส์" OR "कार बहाली"',
    ja: '"愛車紹介" OR "スーパーカーの魅力" OR "車のレストア"'
  },
  "Política e Notícias": {
    pt: '"geopolítica explicada" OR "análise geopolítica" OR "bastidores da política" OR "notícias internacionais"',
    en: '"geopolitics explained" OR "political analysis" OR "behind the news" OR "world politics"',
    es: '"geopolítica explicada" OR "análisis político" OR "noticias mundiales"',
    fr: '"géopolitique expliquée" OR "analyse politique" OR "actualité internationale"',
    de: '"geopolitik erklärt" OR "politische analyse" OR "weltpolitik"',
    it: '"geopolitica spiegata" OR "analisi politica" OR "notizie dal mondo"',
    hi: '"भू-राजनीति की बातें" OR "राजनीतिक विश्लेषण" OR "विश्व समाचार"',
    ja: '"地政学解説" OR "政治分析" OR "国際ニュース"'
  },
  "Engenharia e Construção": {
    pt: '"mega construções" OR "como funciona engenharia" OR "tecnologia de construção" OR "grandes obras"',
    en: '"megaprojects" OR "how engineering works" OR "construction technology" OR "civil engineering documentary"',
    es: '"mega construcciones" OR "cómo funciona la ingeniería" OR "tecnología de construcción"',
    fr: '"mégastructures" OR "comment fonctionne l\'ingénierie" OR "technologie de construction"',
    de: '"megaprojekte" OR "wie funktioniert ingenieurwesen" OR "bautechnologie"',
    it: '"megacostruzioni" OR "come funciona l\'ingegneria" OR "tecnologia edilizia"',
    hi: '"मेगा प्रोजेक्ट्स" OR "इंजीनियरिंग कैसे काम करती है" OR "निर्माण तकनीक"',
    ja: '"メガプロジェクト" OR "ものづくりの裏側" OR "建設テクノロジー"'
  },
  "Artesanato e DIY": {
    pt: '"ideias de faça você mesmo" OR "artesanato criativo" OR "ideias diy" OR "projetos manuais"',
    en: '"do it yourself ideas" OR "creative crafts" OR "diy projects" OR "life hacks craft"',
    es: '"ideas de hazlo tú mismo" OR "artesanías creativas" OR "proyectos diy"',
    fr: '"idées bricolage" OR "artisanat créatif" OR "projets diy"',
    de: '"do it yourself ideen" OR "kreatives basteln" OR "diy projekte"',
    it: '"idee fai da te" OR "artigianato creativo" OR "progetti diy"',
    hi: '"डीआईवाई विचार" OR "रचनात्मक शिल्प" OR "घर पर बनाएं"',
    ja: '"DIYのアイデア" OR "手作りクラフト" OR "ライフハック作品"'
  },
  "ASMR": {
    pt: '"asmr sussurrado" OR "asmr gatilhos" OR "asmr para dormir" OR "som de chuva asmr"',
    en: '"asmr whispering" OR "asmr triggers" OR "asmr for sleep" OR "asmr relaxation"',
    es: '"asmr susurros" OR "asmr desencadenantes" OR "asmr para dormir"',
    fr: '"asmr chuchotement" OR "asmr déclencheurs" OR "asmr pour dormir"',
    de: '"asmr flüstern" OR "asmr trigger" OR "asmr zum einschlafen"',
    it: '"asmr sussurrato" OR "asmr trigger" OR "asmr per dormire"',
    hi: '"एएसएमआर फुसफुसाहट" OR "सोने के लिए एएसएमआर" OR "आरामदायक एएसएमआर"',
    ja: '"ASMR囁き声" OR "睡眠用ASMR" OR "音フェチ動画"'
  },
  "Música e Covers": {
    pt: '"cover acústico" OR "versão acústica" OR "cover de música" OR "músicas famosas cover"',
    en: '"acoustic cover" OR "song cover" OR "famous song cover" OR "musical performance"',
    es: '"cover acústico" OR "cover de canción" OR "versión acústica"',
    fr: '"reprise acoustique" OR "cover chanson" OR "version acoustique"',
    de: '"akustik cover" OR "song cover deutsch" OR "musik cover"',
    it: '"cover acustica" OR "cover canzone" OR "versione acustica"',
    hi: '"ध्वनिक कवर" OR "गाना cover" OR "संगीतमय प्रस्तुति"',
    ja: '"アコースティックカバー" OR "歌ってみた" OR "名曲カバー"'
  },
  "Fotografia": {
    pt: '"dicas de fotografia" OR "como tirar fotos" OR "composição fotográfica" OR "edição de fotos"',
    en: '"photography tips" OR "how to take photos" OR "photography composition" OR "photo editing tips"',
    es: '"consejos de fotografía" OR "cómo tomar fotos" OR "composición fotográfica"',
    fr: '"conseils photographie" OR "comment prendre des photos" OR "composition photo"',
    de: '"fototipps" OR "wie man fotografiert" OR "fotografie komposition"',
    it: '"consigli fotografia" OR "come fare foto" OR "composizione fotografica"',
    hi: '"فोटोग्राफी युक्तियाँ" OR "फ़ोटो कैसे लें" OR "फ़ोटो संपादन"',
    ja: '"写真撮影のコツ" OR "カメラの使い方" OR "写真の構図"'
  },
  "Programação": {
    pt: '"aprenda programação" OR "curso de python" OR "como criar site" OR "programação iniciante"',
    en: '"learn coding" OR "python tutorial" OR "how to code" OR "programming for beginners"',
    es: '"aprender programación" OR "curso de python" OR "desarrollo web"',
    fr: '"apprendre la programmation" OR "tutoriel python" OR "développement web"',
    de: '"programmieren lernen" OR "python tutorial deutsch" OR "webentwicklung"',
    it: '"imparare a programmare" OR "corso di python" OR "sviluppo web"',
    hi: '"कोडिंग सीखें" OR "पायथन ट्यूटोरियल" OR "प्रोग्रामिंग सीखें"',
    ja: '"プログラミング学習" OR "Python入門" OR "Webアプリ開発"'
  },
  "Criptomoedas": {
    pt: '"mercado de cripto" OR "análise de bitcoin" OR "como comprar cripto" OR "notícias criptomoedas"',
    en: '"crypto market" OR "bitcoin analysis" OR "how to buy crypto" OR "cryptocurrency news"',
    es: '"mercado cripto" OR "análisis de bitcoin" OR "noticias criptomonedas"',
    fr: '"marché crypto" OR "analyse bitcoin" OR "actualités cryptomonnaies"',
    de: '"kryptomarkt" OR "bitcoin analyse" OR "kryptowährung news"',
    it: '"mercato cripto" OR "analisi bitcoin" OR "notizie criptovalute"',
    hi: '"क्रिप्टो मार्केट" OR "बिटकॉइन विश्लेषण" OR "क्रिप्टो समाचार"',
    ja: '"仮想通貨分析" OR "ビットコイン投資" OR "暗号資産ニュース"'
  },
  "Sobrevivencialismo": {
    pt: '"técnicas de sobrevivência" OR "bushcraft brasil" OR "preparacionismo" OR "acampamento selvagem"',
    en: '"survival tips" OR "bushcraft techniques" OR "survival gear review" OR "wilderness camping"',
    es: '"técnicas de supervivencia" OR "bushcraft español" OR "preparacionismo"',
    fr: '"techniques de survie" OR "bushcraft camping" OR "survivalisme"',
    de: '"überlebensstrategien" OR "bushcraft deutschland" OR "survival ausrüstung"',
    it: '"tecniche di sopravvivenza" OR "bushcraft italiano" OR "survivalismo"',
    hi: '"जीवित रहने के तरीके" OR "जंगल में कैंपिंग" OR "अस्तित्व कौशल"',
    ja: '"サバイバル技術" OR "ブッシュクラフト" OR "野外キャンプ"'
  },
  "Jardinagem": {
    pt: '"como plantar" OR "jardinagem para iniciantes" OR "cuidar de plantas" OR "horta em casa"',
    en: '"how to grow plants" OR "gardening for beginners" OR "plant care tips" OR "backyard garden"',
    es: '"cómo plantar" OR "jardinería para principiantes" OR "cuidado de plantas"',
    fr: '"comment planter" OR "jardinage débutant" OR "soins des plantes"',
    de: '"pflanzen anbauen" OR "gartenarbeit für anfänger" OR "zimmerpflanzen pflege"',
    it: '"come coltivare piante" OR "giardinaggio per principianti" OR "cura delle piante"',
    hi: '"पौधे कैसे उगाएं" OR "घर पर बागवानी" OR "पौधों की देखभाल"',
    ja: '"家庭菜園の作り方" OR "初心者のガーデニング" OR "観葉植物の育て方"'
  },
  "Minimalismo": {
    pt: '"estilo de vida minimalista" OR "destralhar casa" OR "minimalismo prático" OR "vida simples"',
    en: '"minimalist lifestyle" OR "decluttering tips" OR "practical minimalism" OR "simple living"',
    es: '"estilo de vida minimalista" OR "desapego y minimalismo" OR "vida simple"',
    fr: '"style de vie minimaliste" OR "désencombrer sa maison" OR "vie simple"',
    de: '"minimalistischer lebensstil" OR "ausmisten tipps" OR "einfaches leben"',
    it: '"stile di vita minimalista" OR "decluttering casa" OR "vita semplice"',
    hi: '"अतिवादी जीवन शैली" OR "कम सामान में जीना" OR "सरल जीवन"',
    ja: '"ミニマリストの生活" OR "片付け of コツ" OR "シンプルな暮らし"'
  },
  "Histórias de Terror": {
    pt: '"lendas urbanas" OR "contos de terror" OR "relatos sobrenaturais" OR "creepypasta brasil"',
    en: '"urban legends" OR "horror story compilation" OR "paranormal encounters" OR "creepypasta narration"',
    es: '"leyendas urbanas" OR "historias de terror reales" OR "relatos paranormales"',
    fr: '"légendes urbaines" OR "histoires de fantômes" OR "récits d\'horreur"',
    de: '"gruselgeschichten" OR "unheimliche begegnungen" OR "horrorstory deutsch"',
    it: '"leggende metropolitane" OR "storie dell\'orrore vere" OR "racconti paranormali"',
    hi: '"डरावनी कहानियाँ" OR "भूतिया किस्से" OR "रहस्यमयी घटनाएँ"',
    ja: '"怪談朗読" OR "都市伝説" OR "本当にあった怖い話"'
  },
  "Mitologia": {
    pt: '"mitologia grega" OR "mitologia nórdica" OR "deuses antigos" OR "mitos e lendas"',
    en: '"greek mythology" OR "norse mythology" OR "ancient gods" OR "myths and legends"',
    es: '"mitología griega" OR "mitología nórdica" OR "dioses antiguos"',
    fr: '"mythologie grecque" OR "mythologie nordique" OR "dieux anciens"',
    de: '"griechische mythologie" OR "nordische mythologie" OR "antike götter"',
    it: '"mitologia greca" OR "mitologia vichinga" OR "divinità antiche"',
    hi: '"ग्रीक पौराणिक कथाएं" OR "प्राचीन देवी-देवता" OR "पौराणिक इतिहास"',
    ja: '"ギリシャ神話" OR "北欧神話" OR "古代の神々"'
  },
  "Casas Luxuosas": {
    pt: '"mansões luxuosas" OR "tour em mansão" OR "casas mais caras" OR "arquitetura de luxo"',
    en: '"luxury home tour" OR "mega mansions" OR "most expensive houses" OR "modern luxury architecture"',
    es: '"tour de mansión" OR "casas de lujo caras" OR "arquitectura moderna de lujo"',
    fr: '"visite de maison de luxe" OR "plus belles villas" OR "architecture de luxe"',
    de: '"luxusvilla tour" OR "teuerste häuser" OR "luxus immobilien"',
    it: '"tour casa di lusso" OR "ville più costose" OR "architettura di lusso"',
    hi: '"आलीशान कोठी" OR "दुनिया के सबसे महंगे घर" OR "लक्जरी विला"',
    ja: '"豪華な豪邸ツアー" OR "超高級住宅" OR "豪華な別荘"'
  },
  "Cultura Pop e Geek": {
    pt: '"cultura geek" OR "teorias de marvel" OR "novidades cultura pop" OR "curiosidades nerd"',
    en: '"geek culture" OR "marvel theories" OR "pop culture analysis" OR "nerd universe"',
    es: '"cultura geek" OR "teorías de cómics" OR "noticias geek"',
    fr: '"culture geek" OR "théories de films geek" OR "analyse pop culture"',
    de: '"geek kultur" OR "marvel theorien deutsch" OR "nerd news"',
    it: '"cultura geek" OR "teorie marvel" OR "curiosità nerd"',
    hi: '"गीक संस्कृति" OR "मार्वल थ्योरीज" OR "पॉप संस्कृति"',
    ja: '"アメコミ考察" OR "ポップカルチャー解説" OR "ギークカルチャー"'
  },
  "Maternidade e Família": {
    pt: '"dicas de maternidade" OR "rotina de mãe" OR "educação de filhos" OR "maternidade real"',
    en: '"parenting advice" OR "mom life routine" OR "raising children" OR "family vlog clean"',
    es: '"consejos de maternidad" OR "rutina de madre" OR "crianza de hijos"',
    fr: '"conseils parentalité" OR "routine de maman" OR "éducation bienveillante"',
    de: '"erziehungstipps" OR "mama alltag" OR "kindererziehung"',
    it: '"consigli genitorialità" OR "routine di mamma" OR "crescere figli"',
    hi: '"पालन-पोषण की सलाह" OR "मां की दिनचर्या" OR "बच्चों की परवरिश"',
    ja: '"育児のコツ" OR "子育ての悩み" OR "家族ルーティン"'
  },
  "Treino e Calistenia": {
    pt: '"treino de calistenia" OR "exercícios em casa" OR "ganhar massa muscular" OR "calistenia iniciante"',
    en: '"calisthenics workout" OR "home workout routine" OR "build muscle no weights" OR "bodyweight fitness"',
    es: '"entrenamiento de calistenia" OR "rutina en casa" OR "ganar músculo sin pesas"',
    fr: '"entraînement callisthénie" OR "musculation maison" OR "poids du corps"',
    de: '"calisthenics training" OR "training zu hause" OR "muskelaufbau eigengewicht"',
    it: '"allenamento calistenico" OR "esercizi a casa" OR "muscoli a corpo libero"',
    hi: '"कैलिस्थेनिक्स कसरत" OR "घर पर व्यायाम" OR "मांसपेशियों का विकास"',
    ja: '"自重トレーニング" OR "カリステニクス初心者" OR "自宅ワークアウト"'
  },
  "Histórias Bíblicas": {
    pt: '"histórias da bíblia" OR "estudo bíblico animado" OR "personagens bíblicos" OR "curiosidades da bíblia"',
    en: '"bible stories animation" OR "bible study explained" OR "characters of the bible" OR "biblical history"',
    es: '"historias de la biblia" OR "estudio bíblico animado" OR "personajes bíblicos"',
    fr: '"histoires de la bible" OR "récits bibliques" OR "étude de la bible"',
    de: '"bibelgeschichten animation" OR "bibelstudium erklärt" OR "biblische geschichte"',
    it: '"storie della bibbia" OR "studi biblici" OR "personaggi biblici"',
    hi: '"बाइबिल की कहानियाँ" OR "बाइबिल का अध्ययन" OR "बाइबल इतिहास"',
    ja: '"聖書のアニメーション" OR "聖書の登場人物" OR "聖書歴史解説"'
  },
  "Assuntos Militares": {
    pt: '"tecnologia militar" OR "armas de guerra" OR "história militar" OR "exércitos do mundo"',
    en: '"military technology" OR "weapons of war" OR "military history" OR "world armies documentary"',
    es: '"tecnología militar" OR "armas de guerra" OR "historia militar"',
    fr: '"technologie militaire" OR "armes de guerre" OR "histoire militaire"',
    de: '"militärtechnik" OR "kriegswaffen" OR "militärgeschichte"',
    it: '"tecnologia militare" OR "armi da guerra" OR "storia militare"',
    hi: '"सैन्य तकनीक" OR "युद्ध के हथियार" OR "सैन्य इतिहास"',
    ja: '"最新軍事兵器" OR "戦争の歴史" OR "世界の軍事力"'
  },
  "Vida em Motorhome": {
    pt: '"vida em motorhome" OR "morar na estrada" OR "construindo motorhome" OR "viagem de van"',
    en: '"van life documentary" OR "living in a van" OR "diy van conversion" OR "rv travel vlog"',
    es: '"vida en motorhome" OR "vivir viajando" OR "camperización diy"',
    fr: '"vie en van" OR "vivre sur la route" OR "aménagement fourgon"',
    de: '"leben im wohnmobil" OR "vanlife deutschland" OR "kastenwagen ausbau"',
    it: '"vita in camper" OR "vivere in van" OR "camperizzazione fai da te"',
    hi: '"आरवी लाइफ" OR "सड़क पर जीवन" OR "वैन लाइफ"',
    ja: '"キャンピングカー生活" OR "車中泊で日本一周" OR "バンライフの日常"'
  },
  "Aviação e Aeroespacial": {
    pt: '"tecnologia aeroespacial" OR "como aviões voam" OR "documentário aviação" OR "missões espaciais"',
    en: '"aerospace technology" OR "how planes fly" OR "aviation documentary" OR "space missions"',
    es: '"tecnología aeroespacial" OR "cómo vuelan los aviones" OR "documental aviación"',
    fr: '"technologie aérospatiale" OR "comment volent les avions" OR "documentaire aviation"',
    de: '"luft- und raumfahrt" OR "wie flugzeuge fliegen" OR "luftfahrt doku"',
    it: '"tecnologia aerospaziale" OR "come volano gli aerei" OR "documentario aviazione"',
    hi: '"एयरोस्पेस तकनीक" OR "हवाई जहाज कैसे उड़ते हैं" OR "अंतरिक्ष मिशन"',
    ja: '"航空宇宙工学" OR "飛行機が飛ぶ仕組み" OR "宇宙開発の歴史"'
  },
  "Audiobooks e Resumos": {
    pt: '"resumo de livro" OR "audiolivro completo" OR "desenvolvimento pessoal livro" OR "principais insights"',
    en: '"book summary" OR "full audiobook" OR "personal development book key points" OR "book review animation"',
    es: '"resumen de libro" OR "audiolibro completo" OR "reseña de libro"',
    fr: '"résumé de livre" OR "livre audio complet" OR "fiche de lecture"',
    de: '"buchzusammenfassung" OR "hörbuch komplett" OR "wichtigste buchideen"',
    it: '"riassunto libro" OR "audiolibro completo" OR "recensione libro"',
    hi: '"किताब का सारांश" OR "पूरी ऑडियोबुक" OR "मुख्य विचार"',
    ja: '"本の実用要約" OR "オーディオブック" OR "読書レビュー"'
  },
  "Beleza e Maquiagem": {
    pt: '"dicas de maquiagem" OR "maquiagem para iniciantes" OR "rotina de skincare" OR "cuidados com a pele"',
    en: '"makeup tutorial" OR "skincare routine" OR "makeup for beginners" OR "beauty hacks"',
    es: '"tutorial de maquillaje" OR "rutina de skincare" OR "belleza y cuidado"',
    fr: '"tuto maquillage" OR "routine soins de la peau" OR "astuces beauté"',
    de: '"schminktipps" OR "skincare routine deutsch" OR "make-up für anfänger"',
    it: '"tutorial trucco" OR "routine cura della pelle" OR "segreti di bellezza"',
    hi: '"मेकअप ट्यूटोरियल" OR "त्वचा की देखभाल" OR "सौंदर्य युक्तियाँ"',
    ja: '"初心者メイク" OR "スキンケアルーティン" OR "美肌の秘訣"'
  },
  "Hardware e Setup": {
    pt: '"montagem de pc" OR "setup gamer" OR "review de hardware" OR "placa de vídeo análise"',
    en: '"pc building guide" OR "gaming setup tour" OR "hardware review" OR "gpu performance analysis"',
    es: '"montaje de pc" OR "setup gamer" OR "reseña de hardware"',
    fr: '"monter son pc" OR "setup gamer tour" OR "test matériel informatique"',
    de: '"pc zusammenbauen" OR "gaming setup deutsch" OR "hardware test"',
    it: '"assemblare pc" OR "setup gamer" OR "recensione hardware"',
    hi: '"पीसी बिल्डिंग" OR "गेमिंग  सेटअप" OR "हार्डवेयर समीक्षा"',
    ja: '"自作PCビルド" OR "デスク環境紹介" OR "最新グラフィックボード解説"'
  },
  "Jogos Mobile": {
    pt: '"jogos mobile grátis" OR "gameplay android" OR "jogos para celular" OR "jogos ios"',
    en: '"free mobile games" OR "android gameplay" OR "best mobile games" OR "ios gameplay"',
    es: '"juegos móviles gratis" OR "gameplay de android" OR "juegos para celular"',
    fr: '"jeux mobiles gratuits" OR "gameplay android" OR "meilleurs jeux mobiles"',
    de: '"kostenlose handy spiele" OR "android gameplay deutsch" OR "beste mobile spiele"',
    it: '"giochi cellulare gratis" OR "gameplay android" OR "migliori giochi mobile"',
    hi: '"मुफ़्त mobile गेम" OR "एंड्रॉइड गेमप्ले" OR "सर्वश्रेष्ठ mobile गेम"',
    ja: '"おすすめスマホゲーム" OR "スマホゲーム実況" OR "新作アプリ紹介"'
  },
  "Desenho e Arte": {
    pt: '"como desenhar" OR "tutorial de desenho" OR "desenho passo a passo" OR "dicas de arte"',
    en: '"how to draw" OR "drawing tutorial" OR "sketch step by step" OR "art tips"',
    es: '"cómo dibujar" OR "tutorial de dibujo" OR "dibujo paso a passo"',
    fr: '"comment dessiner" OR "tuto dessin" OR "techniques artistiques"',
    de: '"zeichnen lernen" OR "zeichen tutorial deutsch" OR "kunst tipps"',
    it: '"come disegnare" OR "tutorial disegno" OR "disegnare passo dopo passo"',
    hi: '"ड्राइंग कैसे करें" OR "चित्रकला सीखें" OR "कला युक्तियाँ"',
    ja: '"簡単な描き方" OR "イラストメイキング" OR "絵の描き方コツ"'
  },
  "Aprender Idiomas": {
    pt: '"aprender inglês rápido" OR "dicas de idiomas" OR "inglês para iniciantes" OR "falar espanhol"',
    en: '"learn spanish fast" OR "language learning tips" OR "english for beginners" OR "polyglot method"',
    es: '"aprender inglês rápido" OR "consejos para idiomas" OR "método políglota"',
    fr: '"apprendre l\'anglais" OR "conseils langues" OR "devenir polyglotte"',
    de: '"englisch lernen schnell" OR "sprachtipps" OR "polyglott methode"',
    it: '"imparare l\'inglese" OR "consigli lingue" OR "diventare poliglotta"',
    hi: '"अंग्रेजी कैसे सीखें" OR "भाषा सीखने की युक्तियाँ" OR "बहुभाषी तरीका"',
    ja: '"英会話スピード学習" OR "語学学習のコツ" OR "多言語習得法"'
  }
};

const LANGUAGES = [
  { name: "Português (BR)", code: "pt", region: "BR" },
  { name: "English", code: "en", region: "US" },
  { name: "Español", code: "es", region: "MX" },
  { name: "Français", code: "fr", region: "FR" },
  { name: "Deutsch", code: "de", region: "DE" },
  { name: "Italiano", code: "it", region: "IT" },
  { name: "Hindi", code: "hi", region: "IN" },
  { name: "Japonês", code: "ja", region: "JP" }
];

const AGE_OPTIONS = [
  { label: "Qualquer Idade", value: 0 },
  { label: "Menos de 1 Mês", value: 1 },
  { label: "Menos de 3 Meses", value: 3 },
  { label: "Menos de 5 Meses", value: 5 },
  { label: "Menos de 1 Ano", value: 12 }
];

const FORMAT_OPTIONS = [
  { label: "Qualquer Formato", value: "any" },
  { label: "Shorts (9:16)", value: "shorts" },
  { label: "Vídeo Normal (16:9)", value: "normal" }
];

const getInstantViralTitles = (channel) => {
  const channelName = channel?.title || 'Canal';
  return {
    mainTheme: `Desvendar os segredos de alta performance e bastidores de crescimento acelerado do canal ${channelName}.`,
    structures: [
      "Provocação Baseada em Curiosidade Extrema",
      "Lista de Erros Críticos Ocultados",
      "Revelação de Bastidores / Segredo de Indústria"
    ],
    newTitles: [
      `A Verdade Ocultada Sobre o Sucesso de ${channelName} no YouTube`,
      `Como ${channelName} Cresceu do Zero Usando Esta Estratégia Secreta`,
      `5 Erros Fatais Que Quase Destruíram o Canal ${channelName}`,
      `O Segredo do Algoritmo Que Faz ${channelName} Viralizar Sempre`,
      `Por Que a Maioria dos Canais Falha Onde ${channelName} Venceu`
    ]
  };
};

export const ChannelMiningTab = ({ setActiveTab }) => {
  const { configs, showToast } = useSystemStatus();
  const { miningState, setMiningState } = usePersistence();
  const { channels, niche: selectedNiche, isSearching, maxAgeMonths = 0, videoFormat = 'normal', langCode = 'pt', ultraPrecise = true } = miningState;

  const setSelectedNiche = (val) => setMiningState(prev => ({ ...prev, niche: val }));
  const setChannels = (val) => setMiningState(prev => ({ ...prev, channels: val }));
  const setIsSearching = (val) => setMiningState(prev => ({ ...prev, isSearching: val }));
  const setMaxAgeMonths = (val) => setMiningState(prev => ({ ...prev, maxAgeMonths: val }));
  const setVideoFormat = (val) => setMiningState(prev => ({ ...prev, videoFormat: val }));
  const setSelectedLangCode = (val) => setMiningState(prev => ({ ...prev, langCode: val }));
  const setUltraPrecise = (val) => setMiningState(prev => ({ ...prev, ultraPrecise: val }));

  const selectedLang = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
  const [copiedId, setCopiedId] = useState(null);
  
  // Title Generation States
  const [showTitleGenerator, setShowTitleGenerator] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isRefiningTitles, setIsRefiningTitles] = useState(false);
  const [generatedResults, setGeneratedResults] = useState(null);
  const [generationStep, setGenerationStep] = useState('');
  const [knowledge, setKnowledge] = useState(() => {
    try {
      const saved = localStorage.getItem('guru_title_knowledge');
      const parsed = saved ? JSON.parse(saved) : { themes: [], structures: [], count: 0 };
      return {
        themes: Array.isArray(parsed.themes) ? parsed.themes : [],
        structures: Array.isArray(parsed.structures) ? parsed.structures : [],
        count: typeof parsed.count === 'number' ? parsed.count : 0
      };
    } catch {
      return { themes: [], structures: [], count: 0 };
    }
  });

  const saveKnowledge = (newKnowledge) => {
    setKnowledge(newKnowledge);
    localStorage.setItem('guru_title_knowledge', JSON.stringify(newKnowledge));
  };

  // Helper: lança erro legível quando a API do YouTube retorna um erro
  const checkYouTubeError = (data, context = '') => {
    if (data?.error) {
      const msg = data.error.message || 'Erro desconhecido';
      const code = data.error.code || data.error.status || '';
      if (code === 401 || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('invalid')) {
        throw new Error('Chave do YouTube inválida ou não configurada. Acesse Configurações → Suas Chaves Pessoais.');
      }
      if (code === 403 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exceeded')) {
        throw new Error('Cota do YouTube esgotada. Aguarde até amanhã ou use outra chave.');
      }
      if (code === 400 || msg.toLowerCase().includes('keyinvalid') || msg.toLowerCase().includes('bad request')) {
        throw new Error('Chave do YouTube inválida. Configure em Configurações → Suas Chaves Pessoais.');
      }
      throw new Error(`YouTube API${context ? ` (${context})` : ''}: ${msg}`);
    }
  };

  const handleSearch = async () => {
    // Check Cache
    const cacheKey = `mining_${selectedNiche}_${selectedLang.code}_${maxAgeMonths}_${videoFormat}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 1 * 60 * 60 * 1000) { // 1 hour cache
          console.log("Using cached mining data");
          setChannels(parsed.data.slice(0, 6));
          return;
        }
      } catch (e) {}
    }

    setIsSearching(true);
    setChannels([]);
    
    try {
      // 1. Resolve Niche Search Term
      const langCode = selectedLang.code;
      const nicheTerm = (NICHE_TRANSLATIONS[selectedNiche] && NICHE_TRANSLATIONS[selectedNiche][langCode]) 
                        ? NICHE_TRANSLATIONS[selectedNiche][langCode] 
                        : selectedNiche;

      // 2. Construct Search Query
      // We look for highly viewed videos published recently to find small channels getting traction.
      const date = new Date();
      date.setDate(date.getDate() - 30);
      const publishedAfter = date.toISOString();

      // Utilize extremely precise query structure with operators when available, fallback to Translated Term
      let query = (NICHE_QUERIES[selectedNiche] && NICHE_QUERIES[selectedNiche][langCode])
                        ? NICHE_QUERIES[selectedNiche][langCode]
                        : nicheTerm;
      
      const searchParams = {
        part: 'snippet',
        type: 'video',
        q: query,
        relevanceLanguage: langCode,
        regionCode: selectedLang.region,
        maxResults: '50',
        order: 'viewCount',
        publishedAfter: publishedAfter
      };

      if (videoFormat === 'shorts') {
        searchParams.videoDuration = 'short';
        searchParams.q += ' #shorts';
      } else if (videoFormat === 'normal') {
        searchParams.videoDuration = 'medium'; // 4 - 20 mins guarantees a standard video format
      }

      const res = await fetch(buildYouTubeUrl('search', searchParams));
      const data = await res.json();
      
      // Verifica erro da API antes de acessar .items
      checkYouTubeError(data, 'search');

      if (!data.items || data.items.length === 0) {
        throw new Error("Nenhum canal encontrado com a amostragem atual. Tente outro nicho ou idioma.");
      }

      // 3. Extract unique Channel IDs
      const channelIds = [...new Set(data.items.map(item => item.snippet.channelId))].slice(0, 40);
      
      // 4. Get detailed channel stats
      const channelsRes = await fetch(buildYouTubeUrl('channels', { part: 'snippet,statistics', id: channelIds.join(',') }));
      const channelsData = await channelsRes.json();

      // Verifica erro antes de acessar .items
      checkYouTubeError(channelsData, 'channels');

      // 5. Transform and filter for SMALL CHANNELS with HIGH PERFORMANCE
      let minedChannels = (channelsData.items || [])
        .map(item => {
          const videoCount = parseInt(item.statistics.videoCount || 0);
          const viewCount = parseInt(item.statistics.viewCount || 0);
          const efficiency = Math.round(viewCount / Math.max(1, videoCount));
          
          const publishedAtDate = new Date(item.snippet.publishedAt);
          const now = new Date();
          const ageInMonths = (now.getFullYear() - publishedAtDate.getFullYear()) * 12 + now.getMonth() - publishedAtDate.getMonth();

          return {
            id: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            description: item.snippet.description,
            customUrl: item.snippet.customUrl || `@${item.snippet.title.replace(/\s+/g, '').toLowerCase()}`,
            videoCount: videoCount,
            viewCount: viewCount,
            subscriberCount: parseInt(item.statistics.subscriberCount || 0),
            publishedAt: item.snippet.publishedAt,
            ageInMonths: ageInMonths,
            efficiency: efficiency,
            isExplosive: efficiency > 50000
          };
        })
        .filter(channel => {
          if (channel.viewCount < 5000 || channel.subscriberCount >= 150000 || channel.subscriberCount <= 0) return false;
          if (maxAgeMonths > 0 && channel.ageInMonths > maxAgeMonths) return false;
          return true;
        });

      // 5.5 AI-based filter for extreme precision (if enabled)
      if (ultraPrecise && minedChannels.length > 0) {
        try {
          const aiChannelsList = minedChannels.map((c, i) => `${i + 1}. ID: ${c.id} | Título: ${c.title} | Descrição: ${c.description || 'Sem descrição'}`).join('\n');
          
          const aiPrompt = `Você é um Analista de Nichos do YouTube. Analise a lista de canais abaixo e filtre APENAS os canais que pertencem ou produzem conteúdo de fato focado no nicho "${selectedNiche}".
Regras de classificação:
1. O canal deve ter foco claro ou publicar majoritariamente vídeos sobre o nicho ou sub-nichos de "${selectedNiche}".
2. Canais de notícias generalistas, canais de celebridades e entretenimento genérico sem relação clara com o nicho devem ser excluídos.
3. Se você tiver dúvidas mas a descrição/título apontar fortemente para o nicho, inclua-o.

Canais:
${aiChannelsList}

Responda APENAS com um array JSON contendo as IDs dos canais válidos (e.g., ["id1", "id2"]). Não envie introdução, explicações ou blocos markdown.`;

          const aiResponse = await callAI(aiPrompt, { model: 'gemini-2.5-flash', gptKey: configs.gpt_key });
          const cleanJson = aiResponse.replace(/```json|```/g, '').trim();
          const validIds = JSON.parse(cleanJson);
          
          if (Array.isArray(validIds)) {
            const filteredList = minedChannels.filter(c => validIds.includes(c.id));
            if (filteredList.length > 0) {
              minedChannels = filteredList;
            }
          }
        } catch (aiErr) {
          console.warn("Filtro por IA falhou:", aiErr);
        }
      }

      minedChannels = minedChannels
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 6); // Exactly 6 cards

      setChannels(minedChannels);
      
      // Save to Cache
      sessionStorage.setItem(`mining_${selectedNiche}_${selectedLang.code}_${maxAgeMonths}_${videoFormat}`, JSON.stringify({
        timestamp: Date.now(),
        data: minedChannels
      }));

      if (minedChannels.length === 0) {
        showToast(maxAgeMonths > 0 
          ? `Nenhum canal bombando com menos de ${maxAgeMonths} meses foi encontrado neste nicho agora. Tente remover o filtro de Idade ou mudar o Nicho.` 
          : "Não encontramos canais com os critérios atuais para este nicho. Tente outro tema ou idioma!", "warning");
      }
    } catch (error) {
      console.error("Mining error:", error);
      showToast("Falha na Mineração: " + error.message, "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleModelChannel = (channel) => {
    const url = `https://youtube.com/${channel.customUrl || 'channel/' + channel.id}`;
    localStorage.setItem('guru_auto_model_channel', url);
    setActiveTab('channel-modeler');
  };

  const handleGenerateViralTitles = async (channel) => {
    setSelectedChannel(channel);
    setShowTitleGenerator(true);
    
    // Set instant prefill result
    const instant = getInstantViralTitles(channel);
    setGeneratedResults(instant);
    setIsRefiningTitles(true);
    setIsGeneratingTitles(false); // Do not block with full screen spinner
    setGenerationStep('Refinando com IA...');

    (async () => {
      try {
        // 1. Fetch Top 15 Videos for the channel
        const vidsRes = await fetch(buildYouTubeUrl('search', { part: 'snippet', channelId: channel.id, order: 'viewCount', type: 'video', maxResults: '15' }));
        const vidsData = await vidsRes.json();

        // Verifica erro da API antes de acessar .items
        checkYouTubeError(vidsData, 'videos do canal');
        
        const titles = (vidsData.items || []).map(v => v.snippet.title);
        if (titles.length === 0) throw new Error("Nenhum vídeo encontrado para analisar.");

        // 2. Logic: Analyze Theme and Structure with Gemini
        const analysisPrompt = `
          Analise os seguintes títulos de vídeos de sucesso do canal "${channel.title}":
          ${titles.map((t, i) => `${i+1}. ${t}`).join('\n')}

          Com base nesses títulos e no seu conhecimento prévio sobre o que torna um canal viral:
          1. Identifique o TEMA PRINCIPAL que mais desenvolve o canal (o que o público realmente quer ver aqui).
          2. Identifique 3 ESTRUTURAS VENCEDORAS de títulos (ex: "Pergunta Curiosa", "Desafio Impossível", "Lista de Segredos").
          3. Com base nessas estruturas, mas VARIANDO para não repetir, crie 5 NOVOS TÍTULOS VIRAIS que esse canal poderia postar hoje.

          Responda EXCLUSIVAMENTE em formato JSON puro, sem markdown, com a seguinte estrutura:
          {
            "mainTheme": "Descrição curta do tema",
            "structures": ["Estrutura 1", "Estrutura 2", "Estrutura 3"],
            "newTitles": ["Título 1", "Título 2", "Título 3", "Título 4", "Título 5"]
          }
          Previous Knowledge context: ${JSON.stringify(knowledge.structures.slice(-5))}
        `;

        const response = await callAI(analysisPrompt, { model: 'gemini-2.5-flash', gptKey: configs.gpt_key });
        const cleanJson = response.replace(/```json|```/g, '').trim();
        const results = JSON.parse(cleanJson);

        // 3. Store Knowledge
        const updatedKnowledge = {
          themes: [...new Set([...(knowledge.themes || []), results.mainTheme])].slice(-20),
          structures: [...new Set([...(knowledge.structures || []), ...(results.structures || [])])].slice(-30),
          count: (knowledge.count || 0) + 1
        };
        saveKnowledge(updatedKnowledge);

        setGeneratedResults(results);
        showToast("IA: Títulos virais refinados!", "success");
      } catch (error) {
        console.error("Title Generation Error:", error);
        showToast("Aviso: Falha ao refinar títulos: " + error.message, "warning");
      } finally {
        setIsRefiningTitles(false);
      }
    })();
  };

  const handleCopyUrl = (channel) => {
    const url = `https://youtube.com/${channel.customUrl}`;
    navigator.clipboard.writeText(url);
    setCopiedId(channel.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-6 pb-12 pt-4">
        <header className="mb-4 shrink-0">
          <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                <Youtube className="w-8 h-8 text-white fill-current" />
              </div>
            </div>
            {t('mining.rising_header') || 'Mineração de Canais'}
          </h2>
          <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-cyan pl-4 ml-2 italic">
            {t('mining.subtitle') || 'Detectando Rising Stars e Oportunidades Explosivas'}
          </p>
        </header>

        {/* Filters Box */}
        <div className="glass-card p-8 border border-neon-cyan/20 relative overflow-hidden group shrink-0 shadow-[0_0_50px_rgba(0,243,255,0.05)] mb-4">
          <div className="absolute top-0 right-0 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-neon-cyan/10 transition-colors" />
          <div className="flex flex-col md:flex-row gap-6 relative z-10 items-end w-full">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-neon-cyan" /> {t('mining.lang_label')}
              </label>
              <select 
                value={selectedLang.code}
                onChange={(e) => setSelectedLangCode(e.target.value)}
                className="bg-dark/60 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-neon-cyan/50 hover:bg-dark/80 transition-all cursor-pointer w-full shadow-inner"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-neon-purple" /> {t('mining.niche_label')}
              </label>
              <select 
                value={selectedNiche || 'Finanças'}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="bg-dark/60 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-neon-purple/50 hover:bg-dark/80 transition-all cursor-pointer w-full shadow-inner"
              >
                {NICHES.map(niche => (
                  <option key={niche} value={niche}>{niche}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <History className="w-4 h-4 text-neon-pink" /> Idade do Canal
              </label>
              <select 
                value={maxAgeMonths}
                onChange={(e) => setMaxAgeMonths(Number(e.target.value))}
                className="bg-dark/60 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-neon-pink/50 hover:bg-dark/80 transition-all cursor-pointer w-full shadow-inner"
              >
                {AGE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-green-400" /> Formato
              </label>
              <select 
                value={videoFormat}
                onChange={(e) => setVideoFormat(e.target.value)}
                className="bg-dark/60 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-green-400/50 hover:bg-dark/80 transition-all cursor-pointer w-full shadow-inner"
              >
                {FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className="flex-shrink-0 md:w-auto w-full px-10 py-4 h-[54px] bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isSearching ? <LoadingSpinner size="xs" message="" /> : <><Search className="w-5 h-5" /> {t('mining.btn_search')}</>}
            </button>
          </div>

          {/* Toggles Row */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-t border-white/5 pt-5 relative z-10">
            <div className="flex items-center gap-3">
              <label className="relative flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={ultraPrecise} 
                  onChange={(e) => setUltraPrecise(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-cyan peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                <span className="ms-3 text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 peer-checked:text-neon-cyan transition-colors">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-neon-cyan" /> Busca Ultra-Precisa (IA)
                </span>
              </label>
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider italic">
              {ultraPrecise ? 'Ativado: Filtra canais falsos-positivos usando inteligência artificial' : 'Desativado: Filtro padrão por palavra-chave'}
            </p>
          </div>
        </div>

        <div className="flex flex-col w-full">
          <AnimatePresence mode="wait">
          {isSearching ? (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="h-full flex flex-col items-center justify-center p-20"
             >
               <LoadingSpinner 
                 size="lg" 
                 icon={Youtube} 
                 title="Minerando Canais" 
                 message="Detectando canais rising stars no YouTube..." 
               />
             </motion.div>
          ) : channels.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12"
            >
              {(Array.isArray(channels) ? [...channels.slice(0, 6), ...Array(Math.max(0, 6 - channels.slice(0, 6).length)).fill(null)] : Array(6).fill(null)).map((channel, i) => (
                channel ? (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleModelChannel(channel)}
                  className="glass-card group relative overflow-hidden border border-white/5 hover:border-neon-cyan/50 hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] transition-all duration-300 flex flex-col h-[480px] bg-dark-lighter/40 cursor-pointer hover:-translate-y-1"
                >
                  {/* Decorative Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-neon-cyan/20 transition-colors" />
                  
                  {/* Banner/Avatar Area */}
                  <div className="h-24 bg-gradient-to-r from-neon-purple/20 via-neon-cyan/20 to-blue-600/20 relative">
                    <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl border-4 border-dark overflow-hidden shadow-2xl transition-transform group-hover:scale-110 duration-500">
                      <img src={channel.thumbnail} alt={channel.title} className="w-full h-full object-cover" />
                    </div>
                    {/* Efficiency & Rising Badge */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                      {channel.isExplosive && (
                        <div className="px-3 py-1 bg-neon-pink text-white font-black text-[9px] rounded-full shadow-[0_0_15px_rgba(255,0,110,0.5)] uppercase tracking-tighter flex items-center gap-1 animate-bounce">
                          <Zap className="w-2.5 h-2.5 fill-current" /> {t('mining.explosive_growth')}
                        </div>
                      )}
                      <div className="px-3 py-1 bg-neon-cyan text-dark font-black text-[10px] rounded-full shadow-[0_0_15px_rgba(0,243,255,0.4)] uppercase tracking-tighter">
                        {formatNumber(channel.efficiency)} {t('mining.efficiency').toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-10 px-6 flex flex-col flex-1 relative z-10">
                    <div className="mb-4">
                      <h4 className="text-lg font-black text-white group-hover:text-neon-cyan transition-colors truncate uppercase leading-tight mb-0.5">{channel.title}</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{channel.customUrl}</p>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <p className="text-[9px] text-neon-purple font-black uppercase">{new Date(channel.publishedAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed mb-6 italic opacity-80 group-hover:opacity-100 transition-opacity">
                      {channel.description || "Sem descrição disponível."}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-auto border-t border-white/5 pt-6 pb-6">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mb-1">{t('mining.stats_videos')}</span>
                        <div className="flex items-center gap-1">
                          <Video className="w-3 h-3 text-neon-purple" />
                          <span className="text-white font-black text-sm">{channel.videoCount}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center border-x border-white/10 px-2">
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mb-1">{t('mining.avg_views')}</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-neon-cyan" />
                          <span className="text-white font-black text-sm">{formatNumber(channel.efficiency)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mb-1">{t('mining.stats_subs')}</span>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-green-400" />
                          <span className="text-white font-black text-sm">{formatNumber(channel.subscriberCount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pb-6">
                      <div className="flex items-center justify-center gap-2 py-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl text-xs font-black text-neon-cyan uppercase tracking-widest group-hover:bg-neon-cyan group-hover:text-dark transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]">
                        <Brain className="w-4 h-4" /> Modelar Este Canal
                      </div>
                    </div>
                  </div>
                </motion.div>
                ) : (
                  <div key={`empty-${i}`} className="border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center opacity-30 h-[480px]">
                    <Youtube className="w-10 h-10 text-gray-700 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-700 mb-1">Slot Disponível</p>
                    <p className="text-[10px] text-gray-800">Procurando canais explosivos...</p>
                  </div>
                )
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="h-full flex flex-col items-center justify-center opacity-20 text-center py-40"
            >
              <Youtube className="w-24 h-24 mb-6" />
              <p className="text-sm font-black uppercase tracking-[0.4em]">{t('mining.title')}</p>
              <p className="text-[10px] mt-4 font-bold border-l-2 border-white/20 pl-4">Selecione o idioma e nicho para iniciar o garimpo.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Title Generator Modal */}
      <AnimatePresence>
        {showTitleGenerator && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-dark/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-full bg-dark/90 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-lg">
                      <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-white animate-pulse" />
                      </div>
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                       Agente de Títulos Virais
                        {isRefiningTitles && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neon-cyan/20 text-neon-cyan animate-pulse border border-neon-cyan/30 normal-case tracking-normal">
                            <LoadingSpinner size="xs" message="" />
                            Refinando com IA...
                          </span>
                        )}
                     </h3>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Analisando: {selectedChannel?.title}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowTitleGenerator(false)}
                  className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all group"
                >
                  <X className="w-6 h-6 text-gray-500 group-hover:text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                {isGeneratingTitles ? (
                    <LoadingSpinner 
                      size="lg" 
                      icon={Sparkles} 
                      title="Gerando Títulos Virais" 
                      message="Analisando histórico de vídeos e gerando ideias..." 
                    />
                ) : generatedResults ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left: Agent Insight */}
                    <div className="space-y-8">
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                          <Brain className="w-6 h-6 text-neon-purple" />
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">Mental Model do Agente</h4>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <p className="text-[9px] font-black text-neon-purple uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Zap className="w-3 h-3 fill-current" /> Tema Central Identificado
                            </p>
                            <p className="text-sm font-bold text-gray-300 italic pl-3 border-l-2 border-neon-purple">
                              "{generatedResults.mainTheme}"
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-black text-neon-cyan uppercase tracking-widest mb-3 flex items-center gap-2">
                              <TrendingUp className="w-3 h-3" /> Estruturas Vencedoras do Canal
                            </p>
                            <div className="space-y-2">
                              {generatedResults.structures.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-xl border border-white/5 text-[11px] font-bold text-gray-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <History className="w-3 h-3 text-gray-600" />
                               <span className="text-[9px] font-black text-gray-600 uppercase">Conhecimento Acumulado:</span>
                            </div>
                            <span className="text-[10px] font-mono text-neon-cyan font-black">{knowledge.structures.length} padrões</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: New Titles */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <ListChecks className="w-5 h-5 text-green-400" />
                           <h4 className="text-xs font-black text-white uppercase tracking-widest">Títulos Variados Sugeridos</h4>
                         </div>
                      </div>

                      <div className="space-y-4">
                        {generatedResults.newTitles.map((title, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.08] hover:border-green-500/30 transition-all cursor-pointer relative overflow-hidden"
                            onClick={() => {
                              navigator.clipboard.writeText(title);
                              showToast("Título copiado!", "success");
                            }}
                          >
                             <div className="absolute top-0 right-0 w-12 h-12 bg-green-500/5 rounded-full blur-xl group-hover:bg-green-500/10 transition-all" />
                             <div className="flex gap-4">
                               <span className="text-green-500 font-mono text-xs opacity-50">#{idx + 1}</span>
                               <p className="text-sm font-bold text-white leading-relaxed">{title}</p>
                             </div>
                             <div className="mt-4 flex items-center justify-end">
                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest group-hover:text-green-500 transition-colors uppercase">Clique para copiar DNA Estrutural</span>
                             </div>
                          </motion.div>
                        ))}
                      </div>

                      <button 
                        onClick={() => handleGenerateViralTitles(selectedChannel)}
                        className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                      >
                        <Sparkles className="w-4 h-4" /> Gerar Outra Variação
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
