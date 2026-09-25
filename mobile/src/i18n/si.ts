import type { Dictionary } from './en';
import type { Widen } from './types';

/**
 * Sinhala strings.
 *
 * Typed from the English dictionary, so a missing key is a compile error.
 *
 * Notes for anyone editing:
 * - Sinhala puts the unit before the number ("පැකට් 30", not "30 packets"),
 *   so `common.quantity` is "{{unit}} {{n}}" here.
 * - Sinhala has no grammatical plural in these phrases, so one and other are
 *   usually the same.
 * - Please have a native speaker proofread before the viva. These were written
 *   carefully, not machine translated, but a second reader always helps.
 */
export const si: Widen<Dictionary> = {
  common: {
    appName: 'EatMe',
    tagline: 'අතිරික්ත ආහාර බෙදාගන්න. ඔබේ ප්‍රජාවට ආහාර සපයන්න.',
    continue: 'ඉදිරියට',
    next: 'ඊළඟ',
    back: 'ආපසු',
    skip: 'මඟ හරින්න',
    done: 'අවසන්',
    save: 'සුරකින්න',
    cancel: 'අවලංගු කරන්න',
    confirm: 'තහවුරු කරන්න',
    close: 'වසන්න',
    retry: 'නැවත උත්සාහ කරන්න',
    edit: 'සංස්කරණය',
    delete: 'මකන්න',
    remove: 'ඉවත් කරන්න',
    add: 'එක් කරන්න',
    search: 'සොයන්න',
    filter: 'පෙරහන',
    filters: 'පෙරහන්',
    clear: 'හිස් කරන්න',
    clearAll: 'සියල්ල හිස් කරන්න',
    apply: 'යොදන්න',
    reset: 'යළි සකසන්න',
    all: 'සියල්ල',
    seeAll: 'සියල්ල බලන්න',
    viewDetails: 'විස්තර බලන්න',
    optional: 'අත්‍යවශ්‍ය නොවේ',
    required: 'අත්‍යවශ්‍යයි',
    loading: 'පූරණය වෙමින්',
    refresh: 'යාවත්කාලීන කරන්න',
    yes: 'ඔව්',
    no: 'නැත',
    or: 'හෝ',
    none: 'කිසිවක් නැත',
    notSet: 'සකසා නැත',
    unknown: 'නොදනී',
    you: 'ඔබ',
    items: { one: 'අයිතම {{count}}', other: 'අයිතම {{count}}' },
    quantity: '{{unit}} {{n}}',
    quantityOf: '{{unit}} {{total}}න් {{remaining}}ක් ඉතිරියි',
  },

  a11y: {
    back: 'ආපසු යන්න',
    closeSheet: 'වසන්න',
    increase: '{{label}} වැඩි කරන්න',
    decrease: '{{label}} අඩු කරන්න',
    selected: 'තෝරා ඇත',
    showPassword: 'මුරපදය පෙන්වන්න',
    hidePassword: 'මුරපදය සඟවන්න',
    clearText: 'පෙළ හිස් කරන්න',
    loadingContent: 'අන්තර්ගතය පූරණය වෙමින්',
    tab: '{{label}} ටැබය',
    slideToConfirm:
      'තහවුරු කිරීමට ලිස්සන්න. තිර කියවනයක් සමඟ තහවුරු කිරීමට දෙවරක් තට්ටු කරන්න.',
    urgencyTime: '{{level}}, {{time}}',
  },

  time: {
    months:
      'ජනවාරි|පෙබරවාරි|මාර්තු|අප්‍රේල්|මැයි|ජූනි|ජූලි|අගෝස්තු|සැප්තැම්බර්|ඔක්තෝබර්|නොවැම්බර්|දෙසැම්බර්',
    monthsShort: 'ජන|පෙබ|මාර්තු|අප්‍රේල්|මැයි|ජූනි|ජූලි|අගෝ|සැප්|ඔක්|නොවැ|දෙසැ',
    weekdays: 'ඉරිදා|සඳුදා|අඟහරුවාදා|බදාදා|බ්‍රහස්පතින්දා|සිකුරාදා|සෙනසුරාදා',
    weekdaysShort: 'ඉරි|සඳු|අඟ|බදා|බ්‍රහ|සිකු|සෙන',
    weekdaysMin: 'ඉ|ස|අ|බ|බ්‍ර|සි|සෙ',
    am: 'පෙ.ව.',
    pm: 'ප.ව.',
    clock: '{{period}} {{h}}:{{m}}',
    dateShort: '{{mon}} {{d}}',
    dateMedium: '{{y}} {{mon}} {{d}}',
    dateLong: '{{y}} {{month}} {{d}}, {{weekday}}',
    today: 'අද',
    tomorrow: 'හෙට',
    yesterday: 'ඊයේ',
    now: 'දැන්',
    dayAtTime: '{{day}}, {{time}}',
    dateTime: '{{date}}, {{time}}',
    range: '{{start}} සිට {{end}} දක්වා',
    inMinutes: { one: 'මිනිත්තු {{count}}කින්', other: 'මිනිත්තු {{count}}කින්' },
    inHours: { one: 'පැය {{count}}කින්', other: 'පැය {{count}}කින්' },
    inDays: { one: 'දින {{count}}කින්', other: 'දින {{count}}කින්' },
    minutesAgo: { one: 'මිනිත්තු {{count}}කට පෙර', other: 'මිනිත්තු {{count}}කට පෙර' },
    hoursAgo: { one: 'පැය {{count}}කට පෙර', other: 'පැය {{count}}කට පෙර' },
    daysAgo: { one: 'දින {{count}}කට පෙර', other: 'දින {{count}}කට පෙර' },
    leftMinutes: {
      one: 'මිනිත්තු {{count}}ක් ඉතිරියි',
      other: 'මිනිත්තු {{count}}ක් ඉතිරියි',
    },
    leftHours: { one: 'පැය {{count}}ක් ඉතිරියි', other: 'පැය {{count}}ක් ඉතිරියි' },
    leftDays: { one: 'දින {{count}}ක් ඉතිරියි', other: 'දින {{count}}ක් ඉතිරියි' },
    expired: 'කල් ඉකුත් වී ඇත',
    greetingMorning: 'සුබ උදෑසනක්',
    greetingAfternoon: 'සුබ දහවලක්',
    greetingEvening: 'සුබ සන්ධ්‍යාවක්',
  },

  status: {
    listing: {
      open: 'විවෘතයි',
      partially_claimed: 'කොටසක් ඉල්ලා ඇත',
      fully_claimed: 'සියල්ල ඉල්ලා ඇත',
      expired: 'කල් ඉකුත්',
      cancelled: 'අවලංගුයි',
    },
    request: {
      pending: 'පොරොත්තුවෙන්',
      accepted: 'පිළිගත්තා',
      rejected: 'ප්‍රතික්ෂේප කළා',
      cancelled: 'අවලංගුයි',
    },
    assignment: {
      pending_driver: 'රියදුරු එනතුරු',
      accepted: 'රියදුරු පිළිගත්තා',
      declined: 'ප්‍රතික්ෂේප කළා',
      in_transit: 'ගමනේ',
      completed: 'භාර දුන්නා',
      cancelled: 'අවලංගුයි',
    },
    user: {
      pending: 'අනුමැතිය එනතුරු',
      active: 'සක්‍රියයි',
      inactive: 'අත්හිටුවා ඇත',
      rejected: 'ප්‍රතික්ෂේපිතයි',
    },
    report: {
      draft: 'කෙටුම්පත',
      finalized: 'අවසන් කළා',
    },
  },

  urgency: {
    critical: 'ඉතා හදිසි',
    urgent: 'හදිසි',
    safe: 'නැවුම්',
    criticalHint: 'පැය 6ක් ඇතුළත කල් ඉකුත් වේ',
    urgentHint: 'පැය 48ක් ඇතුළත කල් ඉකුත් වේ',
    safeHint: 'පැය 48කට වඩා ඉතිරියි',
  },

  roles: {
    donor: 'දායකයා',
    recipient: 'ලබන්නා',
    coordinator: 'සම්බන්ධීකාරක',
    driver: 'රියදුරු',
    admin: 'පරිපාලක',
  },

  units: {
    kg: { one: 'කි.ග්‍රෑ.', other: 'කි.ග්‍රෑ.' },
    servings: { one: 'කොටස්', other: 'කොටස්' },
    loaves: { one: 'පාන් ගෙඩි', other: 'පාන් ගෙඩි' },
    packets: { one: 'පැකට්', other: 'පැකට්' },
    cans: { one: 'ටින්', other: 'ටින්' },
    litres: { one: 'ලීටර්', other: 'ලීටර්' },
  },

  categories: {
    packaged: 'ඇසුරුම් කළ',
    prepared: 'පිසූ',
    packagedHint: 'මුද්‍රිත කල් ඉකුත් දිනයක් සහිත මුද්‍රා තැබූ ආහාර',
    preparedHint: 'පිසීමෙන් පසු ආරක්ෂිත කාලයක් ඇති ආහාර',
  },

  storage: {
    ambient: 'කාමර උෂ්ණත්වය',
    chilled: 'ශීතකළ',
    frozen: 'අධිශීත',
  },

  tabs: {
    home: 'මුල් පිටුව',
    listings: 'ලැයිස්තු',
    donate: 'පරිත්‍යාග',
    requests: 'ඉල්ලීම්',
    pickups: 'භාර ගැනීම්',
    browse: 'ගවේෂණය',
    myRequests: 'මගේ ඉල්ලීම්',
    queue: 'පෝලිම',
    deliveries: 'බෙදාහැරීම්',
    drivers: 'රියදුරන්',
    history: 'ඉතිහාසය',
    overview: 'දළ විශ්ලේෂණය',
    users: 'පරිශීලකයන්',
    activity: 'ක්‍රියාකාරකම්',
    reports: 'වාර්තා',
    profile: 'පැතිකඩ',
  },

  settings: {
    title: 'පැතිකඩ',
    account: 'ගිණුම',
    preferences: 'මනාපයන්',
    appearance: 'පෙනුම',
    appearanceSystem: 'පද්ධතිය',
    appearanceLight: 'ආලෝක',
    appearanceDark: 'අඳුරු',
    appearanceHint: 'පද්ධතිය ඔබේ දුරකථනයේ සැකසුම අනුගමනය කරයි.',
    language: 'භාෂාව',
    languageHint: 'මුළු යෙදුමේම භාෂාව වෙනස් කරයි.',
    email: 'විද්‍යුත් තැපෑල',
    phone: 'දුරකථනය',
    address: 'ලිපිනය',
    organisation: 'සංවිධානය',
    role: 'භූමිකාව',
    status: 'ගිණුමේ තත්ත්වය',
    about: 'EatMe ගැන',
    aboutBody:
      'EatMe නිවෙස්, හෝටල් සහ බේකරිවල අතිරික්ත ආහාර, ඒවා අවශ්‍ය පුණ්‍යායතන, ළමා නිවාස සහ වැඩිහිටි නිවාස සමඟ සම්බන්ධ කරයි.',
    version: 'අනුවාදය {{version}}',
    signOut: 'ඉවත් වන්න',
    signOutConfirmTitle: 'ඉවත් වෙනවාද?',
    signOutConfirmBody: 'නැවත පිවිසීමට ඔබේ විද්‍යුත් තැපෑල සහ මුරපදය අවශ්‍ය වේ.',
    replayIntro: 'හැඳින්වීම නැවත බලන්න',
  },

  picker: {
    date: 'දිනය',
    time: 'වේලාව',
    placeholder: 'දිනයක් සහ වේලාවක් තෝරන්න',
    placeholderDate: 'දිනයක් තෝරන්න',
    inOneHour: 'පැයකින්',
    thisEvening: 'අද සවස',
    tomorrowMorning: 'හෙට උදේ',
    tomorrowEvening: 'හෙට සවස',
    inOneWeek: 'සතියකින්',
    previousMonth: 'පෙර මාසය',
    nextMonth: 'ඊළඟ මාසය',
    unavailable: 'ලබා ගත නොහැක',
  },

  errors: {
    generic: 'යමක් වැරදුණා. කරුණාකර නැවත උත්සාහ කරන්න.',
    network: 'EatMe වෙත සම්බන්ධ විය නොහැක. ඔබේ සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
    timeout: 'EatMe පිළිතුරු දීමට වැඩි කාලයක් ගනී. කරුණාකර නැවත උත්සාහ කරන්න.',
    loadFailed: 'මෙය පූරණය කළ නොහැකි විය.',
    notFound: 'මෙය තවදුරටත් නොපවතී.',
    offlineTitle: 'ඔබ සම්බන්ධ වී නැත',
    offlineBody: 'ඔබේ Wi-Fi හෝ ජංගම දත්ත පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
  },

  languageNames: {
    en: 'English',
    si: 'සිංහල',
  },
};
