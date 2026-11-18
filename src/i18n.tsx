import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from './lang'

const kk = {
  langName: 'Қазақша',
  appName: 'Тоғызқұмалақ',
  appTagline: 'Ұлттық ойын — онлайн. Real-time матчтар, ИИ-қарсылас, рейтинг',
  signInTitle: 'Кіру',
  emailLabel: 'Электронды пошта',
  magicLink: 'Сілтеме жіберіңіз',
  magicSent: '✓ Сілтеме поштаға жіберілді — хатты ашып, басыңыз',
  guestBtn: 'Гость ойнау',
  guestNote: 'Гость режимі: аккаунт қажет емес, бірақ нәтижелер сақталмайды',
  or: 'немесе',
  invalidEmail: 'Поштаны дұрыс енгізіңіз',
  authErr: 'Кіру қатесі',
  lobby: 'Лобби',
  createMatch: 'Жаңа матч',
  playAI: 'ИИ-қарсылас',
  openChallenges: 'Ашық шақырулар',
  liveMatches: 'Жанды матчтар',
  join: 'Қосылу',
  watch: 'Көру',
  cancelMatch: 'Болдырмау',
  noOpen: 'Ашық шақырулар жоқ — өзіңіз жасаңыз',
  empty: 'Әзірше ештеңе жоқ',
  profile: 'Профиль',
  history: 'Тарих',
  signOut: 'Шығу',
  rating: 'Рейтинг',
  wins: 'ұтыстар',
  losses: 'ұтылыстар',
  draws: 'теңдіктер',
  games: 'ойындар',
  nameEdit: 'Атыңыз',
  save: 'Сақтау',
  saved: 'Сақталды ✓',
  myTurn: 'Сізді жүрісіңіз',
  oppTurn: 'Қарсылас ойланып жатыр…',
  aiThinking: 'ИИ ойланып жатыр…',
  waitingOpp: 'Қарсылас күтілуде',
  youWin: 'Сіз ұттыңыз! 🎉',
  youLose: 'Сіз ұтылдыңыз',
  drawGame: 'Тең ойын',
  kazans: 'қазан',
  spectators: 'көруші',
  rematch: 'Жаңа матч (ИИ)',
  back: 'Артқа',
  difficulty: 'Қиындық',
  easy: 'Оңай',
  medium: 'Орташа',
  hard: 'Қиын',
  aiSide: 'ИИ екінші жүреді',
  tuzdykMark: 'Т',
  whiteFirst: 'Бастаушы — ақ жақ (сіз)',
  opponentFirst: 'Бастаушы — қарсылас',
  stats: 'Статистика',
  finishedGames: 'Аяқталған матчтар',
  victory: 'ұтыс',
  defeat: 'ұтылыс',
  tie: 'тең',
  vs: 'қарсы',
  eloChange: 'рейинг өзгерісі',
  notFound: 'Матч табылмады',
  deleted: 'Матч өшірілді',
  footer: 'В06.075 «Бұлтты және мобильдік технологиялар» — жоба жұмысы',
  onlineNow: 'қазір желеде',
  youName: 'Сіз',
  hotseatBtn: 'Екі ойыншы — бір экранда',
  joinByCode: 'Код арқылы қосылу',
  player1Name: 'Ойыншы 1',
  player2Name: 'Ойыншы 2',
  errEnterCode: 'Кодты енгізіңіз',
  loadErr: 'Лобби жүктелмеді — байланысты тексеріңіз',
  copyLink: 'Сілтемені көшіру',
  codeHint: 'Соперник лоббиде осы кодты енгізіп қосылады',
  rulesTitle: 'Қалай ойнауға болады',
  rulesText:
    '• Мақсат: қазанда 82+ құмалақ жинау (барлығы 162)\n• Жүріс: жанып тұрған (терракота түсті) өз лункеңді бас — барлық құмалақтар бір-бірлеп сағат тіліне қарсы таралады, біріншісі сол лункеңе қайта түседі\n• Лункада 1 құмалақ болса — ол көрші лункеге ауысады\n• Соңғы құмалақ қарсылас лункесіне түседі: жұп сан болса — барлығын қазанға аласың; дәл 3 болса — туздық (лунка партия соңына дейін сенікі, одан әрі түскен құмалақтар да сенікі)\n• Қарсылас жүре алмаса — сенде қосымша бір жүріс бар\n• Қазанда 82+ — жеңіс, 81:81 — тең ойын',
  hintClick: 'Жанып тұрған лункеңді басып жүріс жаса',
} as const

export type StringKey = keyof typeof kk

const ru: Record<StringKey, string> = {
  langName: 'Русский',
  appName: 'Тоғызқұмалақ',
  appTagline: 'Национальная игра — онлайн. Матчи в реальном времени, ИИ-противник, рейтинг',
  signInTitle: 'Вход',
  emailLabel: 'Электронная почта',
  magicLink: 'Отправить ссылку',
  magicSent: '✓ Ссылка отправлена на почту — откройте письмо и нажмите её',
  guestBtn: 'Играть гостем',
  guestNote: 'Гостевой режим: без аккаунта, но результаты не сохраняются',
  or: 'или',
  invalidEmail: 'Введите корректную почту',
  authErr: 'Ошибка входа',
  lobby: 'Лобби',
  createMatch: 'Новый матч',
  playAI: 'Матч с ИИ',
  openChallenges: 'Открытые вызовы',
  liveMatches: 'Живые матчи',
  join: 'Присоединиться',
  watch: 'Смотреть',
  cancelMatch: 'Отменить',
  noOpen: 'Открытых вызовов нет — создайте свой',
  empty: 'Пока ничего нет',
  profile: 'Профиль',
  history: 'История',
  signOut: 'Выйти',
  rating: 'Рейтинг',
  wins: 'победы',
  losses: 'поражения',
  draws: 'ничьи',
  games: 'игр',
  nameEdit: 'Ваше имя',
  save: 'Сохранить',
  saved: 'Сохранено ✓',
  myTurn: 'Ваш ход',
  oppTurn: 'Соперник думает…',
  aiThinking: 'ИИ думает…',
  waitingOpp: 'Ожидание соперника',
  youWin: 'Вы победили! 🎉',
  youLose: 'Вы проиграли',
  drawGame: 'Ничья',
  kazans: 'казан',
  spectators: 'зрителей',
  rematch: 'Новый матч (ИИ)',
  back: 'Назад',
  difficulty: 'Сложность',
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
  aiSide: 'ИИ ходит вторым',
  tuzdykMark: 'Т',
  whiteFirst: 'Первый ход — за вами',
  opponentFirst: 'Первый ход — за соперником',
  stats: 'Статистика',
  finishedGames: 'Завершённые матчи',
  victory: 'победа',
  defeat: 'поражение',
  tie: 'ничья',
  vs: 'против',
  eloChange: 'изменение рейтинга',
  notFound: 'Матч не найден',
  deleted: 'Матч удалён',
  footer: 'Проект по дисциплине В06.075 «Облачные и мобильные технологии»',
  onlineNow: 'сейчас онлайн',
  youName: 'Вы',
  hotseatBtn: 'Двое на одном экране',
  joinByCode: 'Войти по коду комнаты',
  player1Name: 'Игрок 1',
  player2Name: 'Игрок 2',
  errEnterCode: 'Введите код',
  loadErr: 'Лобби не загрузилось — проверьте связь',
  copyLink: 'Скопировать ссылку',
  codeHint: 'Соперник вводит этот код в лобби и присоединяется',
  rulesTitle: 'Как играть',
  rulesText:
    '• Цель: набрать в казан 82+ камней (всего на доске 162)\n• Ход: нажми на пульсирующую (терракотовую) свою лунку — все камни из неё разлетаются по одному против часовой стрелки, первый камень возвращается в неё же\n• Если в лунке 1 камень — он перекладывается в соседнюю\n• Последний камень падает в лунку соперника: стало чётно — забираешь всё в казан; стало ровно 3 — туздык (лунка твоя до конца партии, всё падающее туда — тоже твоё)\n• Сопернику нечем ходить — у тебя один дополнительный ход\n• 82+ в казане — победа, 81:81 — ничья',
  hintClick: 'Сделай ход: нажми на подсвеченную лунку в нижнем ряду',
}

const dicts: Record<Lang, Record<StringKey, string>> = { kk, ru }

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: StringKey, vars?: Record<string, string | number>) => string
}

const Ctx = createContext<LangCtx | null>(null)

const LOCALE: Record<Lang, string> = { kk: 'kk-KZ', ru: 'ru-RU' }

export function locale(lang: Lang): string {
  return LOCALE[lang]
}

export function fmtDate(ts: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts))
  } catch {
    return ts.slice(0, 10)
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() =>
    localStorage.getItem('togyzqumalaq.lang') === 'ru' ? 'ru' : 'kk',
  )

  useEffect(() => {
    localStorage.setItem('togyzqumalaq.lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (k: StringKey, vars?: Record<string, string | number>) => {
      let s = dicts[lang][k] ?? k
      if (vars) {
        for (const [key, v] of Object.entries(vars)) s = s.replace(`{${key}}`, String(v))
      }
      return s
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLang outside provider')
  return ctx
}
