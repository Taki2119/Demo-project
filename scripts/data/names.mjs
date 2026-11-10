// Kho chữ để GHÉP tên hư cấu. Mọi tên công ty / tên người trong bộ dữ liệu là tổ hợp ngẫu nhiên
// của các mảnh dưới đây — không lấy từ danh sách công ty hay người thật nào.
// Email luôn ở miền dành riêng cho ví dụ (RFC 2606: *.example.com) nên không thể trỏ tới ai thật.

export const SURNAMES = [
  ['佐藤', 'sato'], ['鈴木', 'suzuki'], ['高橋', 'takahashi'], ['田中', 'tanaka'], ['伊藤', 'ito'],
  ['渡辺', 'watanabe'], ['山本', 'yamamoto'], ['中村', 'nakamura'], ['小林', 'kobayashi'], ['加藤', 'kato'],
  ['吉田', 'yoshida'], ['山田', 'yamada'], ['佐々木', 'sasaki'], ['山口', 'yamaguchi'], ['松本', 'matsumoto'],
  ['井上', 'inoue'], ['木村', 'kimura'], ['林', 'hayashi'], ['斎藤', 'saito'], ['清水', 'shimizu'],
  ['山崎', 'yamazaki'], ['森', 'mori'], ['池田', 'ikeda'], ['橋本', 'hashimoto'], ['阿部', 'abe'],
  ['石川', 'ishikawa'], ['山下', 'yamashita'], ['中島', 'nakajima'], ['石井', 'ishii'], ['小川', 'ogawa'],
  ['前田', 'maeda'], ['岡田', 'okada'], ['長谷川', 'hasegawa'], ['藤田', 'fujita'], ['後藤', 'goto'],
  ['近藤', 'kondo'], ['村上', 'murakami'], ['遠藤', 'endo'], ['青木', 'aoki'], ['坂本', 'sakamoto'],
];

export const GIVEN_NAMES = [
  ['翔太', 'shota'], ['大輔', 'daisuke'], ['健太', 'kenta'], ['拓也', 'takuya'], ['直樹', 'naoki'],
  ['亮', 'ryo'], ['悠斗', 'yuto'], ['蓮', 'ren'], ['大和', 'yamato'], ['陽太', 'yota'],
  ['和也', 'kazuya'], ['誠', 'makoto'], ['智也', 'tomoya'], ['航', 'wataru'], ['隆', 'takashi'],
  ['浩二', 'koji'], ['修', 'osamu'], ['悟', 'satoru'], ['樹', 'itsuki'], ['湊', 'minato'],
  ['美咲', 'misaki'], ['陽菜', 'hina'], ['結衣', 'yui'], ['さくら', 'sakura'], ['葵', 'aoi'],
  ['真由', 'mayu'], ['彩', 'aya'], ['愛', 'ai'], ['美穂', 'miho'], ['優子', 'yuko'],
  ['恵', 'megumi'], ['麻衣', 'mai'], ['奈々', 'nana'], ['千尋', 'chihiro'], ['菜摘', 'natsumi'],
  ['理沙', 'risa'], ['花', 'hana'], ['凛', 'rin'], ['楓', 'kaede'], ['明日香', 'asuka'],
];

// Mảnh đầu của tên công ty (từ ghép tự đặt, không phải tên riêng có sẵn).
export const COMPANY_STEMS = [
  'アオバ', 'ミナト', 'ハルカゼ', 'ソラノ', 'ツバサ', 'カナデ', 'ヒカリノ', 'コトハ', 'シズク', 'ナギサ',
  'ユイマール', 'トモエ', 'サクヤ', 'イブキ', 'ミライエ', 'アカツキ', 'リンドウ', 'カスミ', 'ホタル', 'ツムギ',
  '青葉台', '東雲', '朝凪', '白樺', '桜庭', '楓森', '若草', '星見', '水無月', '銀杏',
  '七海', '千歳', '雪見', '風見', '川端', '野々宮', '高砂', '緑丘', '月影', '春日野',
];

export const COMPANY_SUFFIX = {
  it: ['テック', 'システムズ', 'ラボ', 'デジタル', 'ソフト'],
  manufacturing: ['工業', '製作所', '精機', 'マテリアル'],
  retail: ['商店', 'リテール', 'マート', '商事'],
  healthcare: ['メディカル', 'ケアサービス', 'ヘルスケア'],
  finance: ['ファイナンス', '保険サービス', 'キャピタル'],
  education: ['学院', 'エデュケーション', 'スクール'],
  logistics: ['運輸', 'ロジスティクス', '物流'],
  construction: ['建設', 'ホーム', '不動産', '工務店'],
  hospitality: ['フーズ', 'ホテルズ', 'ダイニング'],
  professional_services: ['コンサルティング', 'パートナーズ', '総合事務所'],
};

export function companyName(rng, industry) {
  const stem = rng.pick(COMPANY_STEMS);
  const suffix = rng.pick(COMPANY_SUFFIX[industry]);
  return rng.weighted([
    [`株式会社${stem}${suffix}`, 6],
    [`${stem}${suffix}株式会社`, 3],
    [`合同会社${stem}${suffix}`, 1],
  ]);
}

/** Một người hư cấu: { fullName, local } — `local` là phần trước @ của email. */
export function personName(rng) {
  const [sj, sr] = rng.pick(SURNAMES);
  const [gj, gr] = rng.pick(GIVEN_NAMES);
  return { fullName: `${sj} ${gj}`, local: `${gr}.${sr}` };
}
