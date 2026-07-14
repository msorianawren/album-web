void (async () => {
const fs = await import("node:fs");
const path = await import("node:path");

const dictionariesPath = path.join(__dirname, 'src', 'dictionaries');
const locales = ['de', 'en', 'es', 'fr', 'id', 'ja', 'ko', 'th', 'vi', 'zh'];

// 1. Update Dictionaries
const updates = {
  zh: {
    photo: "张照片",
    video: "个视频",
    welcome_badge: "欢迎",
    open_collection: "打开收藏",
    premium_portfolio: "高级模特作品集",
    featured_story: "精选故事",
    studio_note: "工作室笔记"
  },
  ja: {
    photo: "枚の写真",
    video: "本の動画",
    welcome_badge: "ようこそ",
    open_collection: "コレクションを開く",
    premium_portfolio: "プレミアムモデルポートフォリオ",
    featured_story: "注目のストーリー",
    studio_note: "スタジオノート"
  },
  ko: {
    photo: "장",
    video: "개",
    welcome_badge: "환영합니다",
    open_collection: "컬렉션 열기",
    premium_portfolio: "프리미엄 모델 포트폴리오",
    featured_story: "추천 스토리",
    studio_note: "스튜디오 노트"
  },
  vi: {
    photo: "ẢNH",
    video: "VIDEO",
    welcome_badge: "Chào mừng",
    open_collection: "Mở bộ sưu tập",
    premium_portfolio: "Hồ sơ người mẫu cao cấp",
    featured_story: "Câu chuyện nổi bật",
    studio_note: "Ghi chú studio"
  },
  en: {
    photo: "PHOTOS",
    video: "VIDEOS",
    welcome_badge: "Welcome",
    open_collection: "Open collection",
    premium_portfolio: "Premium model portfolio",
    featured_story: "Featured story",
    studio_note: "Studio note"
  },
  es: {
    photo: "FOTOS",
    video: "VIDEOS",
    welcome_badge: "Bienvenido",
    open_collection: "Abrir colección",
    premium_portfolio: "Portafolio de modelo premium",
    featured_story: "Historia destacada",
    studio_note: "Nota de estudio"
  },
  fr: {
    photo: "PHOTOS",
    video: "VIDÉOS",
    welcome_badge: "Bienvenue",
    open_collection: "Ouvrir la collection",
    premium_portfolio: "Portfolio de modèle premium",
    featured_story: "Histoire à la une",
    studio_note: "Note de studio"
  },
  de: {
    photo: "FOTOS",
    video: "VIDEOS",
    welcome_badge: "Willkommen",
    open_collection: "Sammlung öffnen",
    premium_portfolio: "Premium-Modell-Portfolio",
    featured_story: "Ausgewählte Geschichte",
    studio_note: "Studio-Notiz"
  },
  id: {
    photo: "FOTO",
    video: "VIDEO",
    welcome_badge: "Selamat datang",
    open_collection: "Buka koleksi",
    premium_portfolio: "Portofolio model premium",
    featured_story: "Cerita unggulan",
    studio_note: "Catatan studio"
  },
  th: {
    photo: "รูปภาพ",
    video: "วิดีโอ",
    welcome_badge: "ยินดีต้อนรับ",
    open_collection: "เปิดคอลเลกชัน",
    premium_portfolio: "พอร์ตโฟลิโอนางแบบระดับพรีเมียม",
    featured_story: "เรื่องราวเด่น",
    studio_note: "บันทึกจากสตูดิโอ"
  }
};

locales.forEach(locale => {
  const file = path.join(dictionariesPath, `${locale}.json`);
  if (!fs.existsSync(file)) return;
  
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  if (!data.albums) data.albums = {};
  if (!data.landing) data.landing = {};
  
  const u = updates[locale];
  
  data.albums.photo = u.photo;
  data.albums.video = u.video;
  data.albums.welcome_badge = u.welcome_badge;
  data.albums.open_collection = u.open_collection;
  
  data.landing.premium_portfolio = u.premium_portfolio;
  data.landing.featured_story = u.featured_story;
  data.landing.studio_note = u.studio_note;
  
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
});

console.log("Updated JSON dictionaries.");

// 2. Generate SQL Script
const sql = `
-- Album 1: Blessings
UPDATE albums SET translations = jsonb_build_object(
  'zh', jsonb_build_object('title', '财神庙的祝福', 'description', '一张优雅的相册，记录了我去财神庙祈求好运的旅程。'),
  'ja', jsonb_build_object('title', '富の神殿での祝福', 'description', '富の神殿を訪れて幸運を祈る旅の優雅な写真アルバム。'),
  'ko', jsonb_build_object('title', '재물의 신전에서의 축복', 'description', '재물의 신전을 방문하여 행운을 기원하는 우아한 사진 앨범입니다.'),
  'vi', jsonb_build_object('title', 'Cầu bình an tại Đền Thần Tài', 'description', 'Một cuốn album ảnh duyên dáng ghi lại chuyến viếng thăm Đền Thần Tài để cầu mong may mắn và tài lộc...'),
  'es', jsonb_build_object('title', 'Bendiciones en el Templo del Dios de la Riqueza', 'description', 'Un elegante álbum de fotos que captura mi visita al Templo del Dios de la Riqueza para orar por la fortuna...'),
  'fr', jsonb_build_object('title', 'Bénédictions au Temple du Dieu de la Richesse', 'description', 'Un album photo gracieux capturant ma visite au Temple du Dieu de la Richesse...'),
  'de', jsonb_build_object('title', 'Segen im Tempel des Gottes des Reichtums', 'description', 'Ein anmutiges Fotoalbum, das meinen Besuch im Tempel des Gottes des Reichtums festhält...'),
  'id', jsonb_build_object('title', 'Berkat di Kuil Dewa Kekayaan', 'description', 'Album foto anggun yang merekam kunjungan saya ke Kuil Dewa Kekayaan...'),
  'th', jsonb_build_object('title', 'ขอพรที่วัดเทพเจ้าแห่งความมั่งคั่ง', 'description', 'อัลบั้มภาพที่สง่างามซึ่งบันทึกการมาเยือนวัดเทพเจ้าแห่งความมั่งคั่งเพื่อขอโชคลาภ...')
) WHERE slug = 'blessings-at-the-god-of-wealth-temple';

-- Album 2: Rural Life
UPDATE albums SET translations = jsonb_build_object(
  'zh', jsonb_build_object('title', '乡村生活', 'description', '灵感来自越南农村妇女简单之美的一本宁静的乡村相册...'),
  'ja', jsonb_build_object('title', '田舎の生活', 'description', 'ベトナムの農村女性の素朴な美しさにインスパイアされた、平和な田舎のアルバム...'),
  'ko', jsonb_build_object('title', '시골 생활', 'description', '베트남 농촌 여성들의 소박한 아름다움에서 영감을 받은 평화로운 시골 앨범...'),
  'vi', jsonb_build_object('title', 'Cuộc Sống Thôn Quê', 'description', 'Một cuốn album đồng quê thanh bình lấy cảm hứng từ vẻ đẹp mộc mạc của người phụ nữ nông thôn Việt Nam...'),
  'es', jsonb_build_object('title', 'Vida Rural', 'description', 'Un álbum rural pacífico inspirado en la belleza sencilla de las mujeres rurales vietnamitas...'),
  'fr', jsonb_build_object('title', 'Vie Rurale', 'description', 'Un paisible album de campagne inspiré par la beauté simple des femmes rurales vietnamiennes...'),
  'de', jsonb_build_object('title', 'Landleben', 'description', 'Ein friedliches ländliches Album, inspiriert von der einfachen Schönheit vietnamesischer Landfrauen...'),
  'id', jsonb_build_object('title', 'Kehidupan Pedesaan', 'description', 'Album pedesaan yang damai terinspirasi oleh keindahan sederhana wanita pedesaan Vietnam...'),
  'th', jsonb_build_object('title', 'ชีวิตในชนบท', 'description', 'อัลบั้มภาพชนบทที่สงบสุขซึ่งได้รับแรงบันดาลใจจากความงามที่เรียบง่ายของหญิงชาวชนบทเวียดนาม...')
) WHERE slug = 'rural-life';

-- Album 3: European Diary
UPDATE albums SET translations = jsonb_build_object(
  'zh', jsonb_build_object('title', '欧洲日记 - 穿越永恒之地的旅程', 'description', '一次穿越欧洲的时尚旅行，捕捉历史名城的难忘瞬间...'),
  'ja', jsonb_build_object('title', 'ヨーロッパ日記 – 時代を超えた大地を巡る旅', 'description', 'ヨーロッパを巡るスタイリッシュな旅。歴史的な都市の忘れられない瞬間を捉えて...'),
  'ko', jsonb_build_object('title', '유럽 일기 - 영원한 땅을 가로지르는 여정', 'description', '유럽 전역을 여행하는 스타일리시한 여정으로, 역사적인 도시를 통해 잊을 수 없는 순간들을 포착...'),
  'vi', jsonb_build_object('title', 'Nhật Ký Châu Âu - Hành Trình Xuyên Qua Vùng Đất Vượt Thời Gian', 'description', 'Một chuyến du lịch phong cách xuyên Châu Âu, ghi lại những khoảnh khắc khó quên qua các thành phố lịch sử...'),
  'es', jsonb_build_object('title', 'Diario Europeo - Un Viaje por Tierras Atemporales', 'description', 'Un elegante viaje por Europa, capturando momentos inolvidables a través de ciudades históricas...'),
  'fr', jsonb_build_object('title', 'Journal Européen - Un Voyage à Travers des Terres Intemporelles', 'description', 'Un voyage élégant à travers l''Europe, capturant des moments inoubliables à travers des villes historiques...'),
  'de', jsonb_build_object('title', 'Europäisches Tagebuch - Eine Reise durch zeitlose Länder', 'description', 'Eine stilvolle Reise durch Europa, die unvergessliche Momente in historischen Städten festhält...'),
  'id', jsonb_build_object('title', 'Buku Harian Eropa - Perjalanan Melintasi Tanah Tanpa Waktu', 'description', 'Perjalanan penuh gaya melintasi Eropa, mengabadikan momen tak terlupakan melalui kota-kota bersejarah...'),
  'th', jsonb_build_object('title', 'บันทึกยุโรป - การเดินทางผ่านดินแดนเหนือกาลเวลา', 'description', 'การเดินทางท่องเที่ยวอย่างมีสไตล์ทั่วยุโรป บันทึกช่วงเวลาที่น่าจดจำผ่านเมืองประวัติศาสตร์...')
) WHERE slug = 'european-diary-a-journey-across-timeless-lands';

-- Album 4: Black Ao Dai
UPDATE albums SET translations = jsonb_build_object(
  'zh', jsonb_build_object('title', '优雅白色花卉刺绣的黑色奥黛', 'description', '一幅传统的越南肖像，身着饰有优雅白色花卉的黑色奥黛...'),
  'ja', jsonb_build_object('title', 'エレガントな白い花の刺繍が施された黒いアオザイ', 'description', 'エレガントな白い花柄で装飾された黒いアオザイを特徴とする、伝統的なベトナムのポートレート...'),
  'ko', jsonb_build_object('title', '우아한 흰색 꽃 자수가 있는 검은색 아오자이', 'description', '우아한 흰색 꽃 무늬로 장식된 검은색 아오자이를 특징으로 하는 전통적인 베트남 초상화...'),
  'vi', jsonb_build_object('title', 'Áo Dài đen thêu hoa trắng thanh lịch', 'description', 'Bức chân dung mang đậm nét truyền thống Việt Nam với tà Áo Dài đen được trang trí bằng họa tiết hoa trắng thanh lịch...'),
  'es', jsonb_build_object('title', 'Áo Dài negro con elegante bordado floral blanco', 'description', 'Un retrato tradicional vietnamita que presenta un Áo Dài negro decorado con elegante flora blanca...'),
  'fr', jsonb_build_object('title', 'Áo Dài noir avec d''élégantes broderies florales blanches', 'description', 'Un portrait traditionnel vietnamien mettant en vedette un Áo Dài noir décoré d''élégante flore blanche...'),
  'de', jsonb_build_object('title', 'Schwarzes Áo Dài mit eleganter weißer Blumenstickerei', 'description', 'Ein traditionelles vietnamesisches Porträt mit einem schwarzen Áo Dài, verziert mit eleganter weißer Flora...'),
  'id', jsonb_build_object('title', 'Áo Dài hitam dengan sulaman bunga putih yang elegan', 'description', 'Potret tradisional Vietnam yang menampilkan Áo Dài hitam yang dihiasi dengan flora putih yang elegan...'),
  'th', jsonb_build_object('title', 'อ่าวหญ่ายสีดำพร้อมลายปักดอกไม้สีขาวที่สวยงาม', 'description', 'ภาพบุคคลแบบดั้งเดิมของเวียดนามที่มีอ่าวหญ่ายสีดำซึ่งตกแต่งด้วยดอกไม้สีขาวที่สง่างาม...')
) WHERE slug = 'black-ao-dai-with-elegant-white-floral-embroidery';


-- Landing Page Update
UPDATE landing_page_settings SET translations = jsonb_build_object(
  'zh', jsonb_build_object(
    'headline', '光影塑造的社论风采。', 
    'subheadline', '为电影广告、亲密肖像和奢华故事提供专业模特服务。',
    'body', '为精选相册、动态影像和私人客户收藏策划的作品集空间。',
    'primary_cta_label', '查看作品集',
    'secondary_cta_label', '关于 Oriana',
    'feature_title', '面向公众的私人档案。',
    'feature_body', '相册可以公开、更新中或私有，同时确保访客看到的登陆页面始终保持精致完美。'
  ),
  'ja', jsonb_build_object(
    'headline', '光に形作られたエディトリアルな存在感。', 
    'subheadline', 'シネマティックなキャンペーン、親密なポートレート、そして静かなラグジュアリーストーリーのためのプロフェッショナルモデル。',
    'body', '厳選されたアルバム、動画、プライベートクライアントコレクションのためのキュレートされたポートフォリオスペース。',
    'primary_cta_label', 'ポートフォリオを見る',
    'secondary_cta_label', 'オリアナについて',
    'feature_title', '公開された顔を持つプライベートアーカイブ。',
    'feature_body', 'アルバムは公開、更新中、または非公開にすることができ、ランディングページは訪問者に対して常に洗練された状態を保ちます。'
  ),
  'ko', jsonb_build_object(
    'headline', '빛으로 빚어낸 에디토리얼의 존재감.', 
    'subheadline', '시네마틱 캠페인, 친밀한 초상화, 조용한 럭셔리 스토리를 위한 전문 모델.',
    'body', '엄선된 앨범, 움직이는 이미지, 개인 고객 컬렉션을 위해 선별된 포트폴리오 공간입니다.',
    'primary_cta_label', '포트폴리오 보기',
    'secondary_cta_label', '오리아나 소개',
    'feature_title', '대중을 향한 프라이빗 아카이브.',
    'feature_body', '앨범은 공개, 업데이트 중 또는 비공개로 유지될 수 있으며, 방문자를 위한 랜딩 페이지는 항상 세련된 상태를 유지합니다.'
  ),
  'vi', jsonb_build_object(
    'headline', 'Sự hiện diện mang tính thời trang, được định hình bởi ánh sáng.', 
    'subheadline', 'Người mẫu chuyên nghiệp cho các chiến dịch điện ảnh, chân dung thân mật và những câu chuyện sang trọng thầm kín.',
    'body', 'Một không gian danh mục đầu tư được tuyển chọn cho các album, hình ảnh động và bộ sưu tập khách hàng tư nhân.',
    'primary_cta_label', 'Xem danh mục',
    'secondary_cta_label', 'Về Oriana',
    'feature_title', 'Lưu trữ cá nhân với giao diện công khai.',
    'feature_body', 'Album có thể được công khai, đang cập nhật hoặc giữ bí mật, trong khi trang chủ luôn được trau chuốt cho khách truy cập.'
  ),
  'es', jsonb_build_object(
    'headline', 'Presencia editorial, moldeada en la luz.', 
    'subheadline', 'Modelo profesional para campañas cinematográficas, retratos íntimos y tranquilas historias de lujo.',
    'body', 'Un espacio de portafolio seleccionado para álbumes, imágenes en movimiento y colecciones de clientes privados.',
    'primary_cta_label', 'Ver portafolio',
    'secondary_cta_label', 'Sobre Oriana',
    'feature_title', 'Un archivo privado con una cara pública.',
    'feature_body', 'Los álbumes pueden ser públicos, en actualización o privados, mientras que la página de destino se mantiene impecable para los visitantes.'
  ),
  'fr', jsonb_build_object(
    'headline', 'Présence éditoriale, façonnée dans la lumière.', 
    'subheadline', 'Modèle professionnel pour les campagnes cinématographiques, les portraits intimes et les histoires de luxe discret.',
    'body', 'Un espace de portfolio sélectionné pour les albums, les images animées et les collections de clients privés.',
    'primary_cta_label', 'Voir le portfolio',
    'secondary_cta_label', 'À propos d''Oriana',
    'feature_title', 'Une archive privée avec un visage public.',
    'feature_body', 'Les albums peuvent être publics, en cours de mise à jour ou privés, tandis que la page d''accueil reste impeccable pour les visiteurs.'
  ),
  'de', jsonb_build_object(
    'headline', 'Redaktionelle Präsenz, geformt im Licht.', 
    'subheadline', 'Professionelles Model für filmische Kampagnen, intime Porträts und leise Luxusgeschichten.',
    'body', 'Ein kuratierter Portfolio-Bereich für ausgewählte Alben, bewegte Bilder und private Kundensammlungen.',
    'primary_cta_label', 'Portfolio ansehen',
    'secondary_cta_label', 'Über Oriana',
    'feature_title', 'Ein privates Archiv mit einem öffentlichen Gesicht.',
    'feature_body', 'Alben können öffentlich, in Aktualisierung oder privat sein, während die Zielseite für Besucher stets poliert bleibt.'
  ),
  'id', jsonb_build_object(
    'headline', 'Kehadiran editorial, dibentuk dalam cahaya.', 
    'subheadline', 'Model profesional untuk kampanye sinematik, potret intim, dan cerita kemewahan yang tenang.',
    'body', 'Ruang portofolio yang dikurasi untuk album pilihan, gambar bergerak, dan koleksi klien pribadi.',
    'primary_cta_label', 'Lihat portofolio',
    'secondary_cta_label', 'Tentang Oriana',
    'feature_title', 'Arsip pribadi dengan wajah publik.',
    'feature_body', 'Album dapat bersifat publik, dalam pembaruan, atau pribadi sementara halaman arahan tetap rapi untuk pengunjung.'
  ),
  'th', jsonb_build_object(
    'headline', 'การปรากฏตัวในสไตล์เอดิทอเรียล ที่หล่อหลอมด้วยแสงสว่าง.', 
    'subheadline', 'นางแบบมืออาชีพสำหรับแคมเปญภาพยนตร์ ภาพถ่ายบุคคลที่ใกล้ชิด และเรื่องราวความหรูหราที่เงียบสงบ.',
    'body', 'พื้นที่พอร์ตโฟลิโอที่คัดสรรมาสำหรับอัลบั้ม รูปภาพเคลื่อนไหว และคอลเลกชันส่วนตัวของลูกค้า.',
    'primary_cta_label', 'ดูพอร์ตโฟลิโอ',
    'secondary_cta_label', 'เกี่ยวกับ Oriana',
    'feature_title', 'คลังเก็บถาวรส่วนตัวที่มีหน้าตาสาธารณะ',
    'feature_body', 'อัลบั้มสามารถเปิดเผยต่อสาธารณะ กำลังอัปเดต หรือเก็บไว้เป็นส่วนตัวในขณะที่หน้าแรกยังคงความสวยงามสำหรับผู้เข้าชม'
  )
);
`;

fs.writeFileSync(path.join(__dirname, 'supabase', 'migrations', '202607090400_seed_translations.sql'), sql);
console.log("SQL Seed generated.");
})();
