import type { ThemeTopic } from '../types/themeCards';

export interface KioskAction {
  id: string;
  title: string;
  label: string;
  question: string;
  topic: ThemeTopic;
  icon: string;
  accent: string;
}

export interface KioskRouteGuide {
  main: string;
  closing: string;
  foodNearby: string;
}

export interface KioskServiceGuide {
  restroom: string;
}

export interface KioskGuideVisualCard {
  title: string;
  image: string;
  eyebrow: string;
  body: string;
}

export interface KioskGuideVisualMetric {
  value: string;
  label: string;
  detail: string;
}

export interface KioskGuideVisualStorylineItem {
  tag: string;
  title: string;
  body: string;
}

export interface KioskGuideVisual {
  title: string;
  subtitle: string;
  heroImage: string;
  overview: string;
  facts: string[];
  metrics: KioskGuideVisualMetric[];
  cards: KioskGuideVisualCard[];
  storyline: KioskGuideVisualStorylineItem[];
  tips: string[];
}

export interface KioskSpotConfig {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  locationHint: string;
  backgroundImage: string;
  storySpotId: string;
  storyCoverImage: string;
  storyTitle: string;
  storyHint: string;
  accent: string;
  accentSoft: string;
  greeting: string;
  guideScript: string;
  guideVisual: KioskGuideVisual;
  routeGuide: KioskRouteGuide;
  serviceGuide: KioskServiceGuide;
  idleTitle: string;
  idleSubtitle: string;
  ambientTags: string[];
  actions: KioskAction[];
}

interface ExpandedSpotSeed {
  id: string;
  storySpotId: string;
  name: string;
  shortName: string;
  subtitle: string;
  locationHint: string;
  image: string;
  storyTitle: string;
  storyHint: string;
  accent: string;
  accentSoft: string;
  greeting: string;
  guideScript: string;
  guideVisual: KioskGuideVisual;
  routeMain: string;
  routeClosing: string;
  foodNearby: string;
  restroom: string;
  idleTitle: string;
  idleSubtitle: string;
  ambientTags: string[];
}

interface KioskSpotDetailPolish {
  guideScript?: string;
  guideVisual?: Partial<KioskGuideVisual>;
  routeGuide?: Partial<KioskRouteGuide>;
  serviceGuide?: Partial<KioskServiceGuide>;
  ambientTags?: string[];
}

const lingshanDafoGuide =
  '你现在看到的是灵山胜境的标志性景观——灵山大佛。它于1994年奠基，1997年11月15日落成开光，通高88米，佛体79米、莲花座9米，连同台基总高约101.5米。整尊大佛用铜约725吨，由两千多块铜壁板拼接而成，远看庄严，近看衣纹和莲花座的工艺非常细。游览时建议先在广场拍大佛全景，再沿台阶慢慢往上看佛足、莲花座和铜板细节，最后体验“抱佛脚”祈福。下一站可以顺路去祥符禅寺感受千年法脉，或者去九龙灌浴看动态演绎。';

const nineDragonGuide =
  '这里是九龙灌浴，是灵山胜境最有仪式感的动态景观之一。它讲的是释迦牟尼诞生时“九龙吐水、沐浴太子”的佛教典故。演出开始后，莲花会缓缓打开，太子像升起，九条龙同时喷水，配合音乐和喷泉，游客能直观看到“花开见佛”的场景。观看时建议站在广场中轴稍靠后的位置，既能看到莲花开启，也能拍到九龙环绕的全景。看完后可以继续前往灵山大佛，形成从佛诞典故到大佛瞻礼的一条文化动线。';

const xiangfuTempleGuide =
  '这里是祥符禅寺，灵山佛教文化的历史根脉就在这里。相传唐代贞观年间，玄奘法师西行取经归来，见马山一带山形酷似印度灵鹫山，便称这里为“小灵山”，并嘱弟子窥基法师在此住持道场。北宋大中祥符年间，寺院获赐“祥符禅寺”之名，所以它既有唐代法脉，也有宋代赐额的历史记忆。参观时可以放慢脚步，看山门、中轴殿堂和礼佛空间，注意保持安静，不高声喧哗。这里适合作为从大佛广场进入深度文化游的安静一站。';

const defaultGuide =
  '欢迎来到灵山胜境。这里位于江苏无锡太湖之滨，是以灵山大佛、祥符禅寺、九龙灌浴、梵宫等景观组成的佛教文化主题景区。它既有唐代“小灵山”的历史渊源，也有现代大型佛教文化建筑和演艺体验。第一次游览建议先看灵山大佛，了解景区核心地标；再到九龙灌浴观看佛诞典故演绎；如果时间充裕，可以继续去梵宫和五印坛城，感受建筑、艺术和礼佛文化。你也可以直接问我下一站怎么走、哪里适合拍照或附近有哪些服务。';

const lingshanDafoRoute: KioskRouteGuide = {
  main:
    '你现在在灵山大佛观景区，下一站我建议先沿中轴线下行，到祥符禅寺停留15到25分钟，看看这条唐代法脉的历史根源；再往九龙灌浴广场走，留意最近一场喷泉演绎。如果体力和时间都充裕，再继续去梵宫或五印坛城，那里更适合慢慢看建筑和艺术细节。',
  closing:
    '如果已经接近闭园，就不要再往远处深入了。建议从大佛广场沿主游线下行，经过祥符禅寺外侧或九龙灌浴广场，直接向出口和游客服务中心方向走，边走边拍收尾照片。',
  foodNearby:
    '从大佛广场出发，吃饭优先考虑往梵宫、游客服务中心或景区主服务区方向走，比较容易找到素面、素斋和简餐。爬台阶后可以先补水休息，不建议空腹继续赶远路。',
};

const lingshanDafoService: KioskServiceGuide = {
  restroom:
    '你现在在大佛广场附近，找厕所建议先沿主游线往广场下方和游客服务区方向走，留意“卫生间 / WC / 游客服务中心”的指示牌。这里人流量大，如果你在台阶或平台上，先下到平缓主路再找标识会更安全。实在找不到，可以直接询问附近工作人员或志愿者。',
};

const nineDragonRoute: KioskRouteGuide = {
  main:
    '你现在在九龙灌浴广场。刚看完演出的话，建议沿中轴线往灵山大佛方向走，先看大佛远景，再上行体验抱佛脚祈福；如果还没到演出时间，可以先在广场周边找中轴视角等候，演出结束后再去大佛。时间充裕时，后续可以转去祥符禅寺，让动感演绎和千年寺院形成一条完整文化线。',
  closing:
    '如果接近闭园，九龙灌浴这里比较适合作为收尾点。建议看完广场全景后直接顺主路往出口方向走，不再临时增加梵宫、五印坛城这类耗时较长的点。',
  foodNearby:
    '九龙灌浴周边适合短暂停留和补水，正餐建议向游客服务中心、梵宫服务区或景区主餐饮点移动，选择素面、素斋或简餐会更稳。',
};

const nineDragonService: KioskServiceGuide = {
  restroom:
    '你现在在九龙灌浴广场附近，找厕所不要往喷泉核心区里面走，建议沿广场外侧主路看“卫生间 / WC / 游客服务中心”指示牌，通常服务设施会布置在广场边缘或通往主游线的节点。现在人多的话，先离开观看人群密集区，再按指示牌走会更快也更安全。',
};

const xiangfuTempleRoute: KioskRouteGuide = {
  main:
    '你现在在祥符禅寺入口。建议先用10到20分钟安静参观寺院山门和中轴空间，然后沿主路前往灵山大佛观景区，看大佛全景和莲花座细节；如果还没看九龙灌浴，之后可以下行到九龙灌浴广场，衔接佛诞典故演绎。这样走动线顺，不容易来回折返。',
  closing:
    '如果接近闭园，祥符禅寺适合作为最后一个安静收尾点。请不要再上行到耗时较长区域，建议沿主游线往出口方向移动，注意听现场广播。',
  foodNearby:
    '祥符禅寺附近更适合安静参观，餐食建议往游客服务中心、梵宫服务区或主餐饮点走。想吃轻一点，可以优先找素面、素斋或热饮补给。',
};

const xiangfuTempleService: KioskServiceGuide = {
  restroom:
    '你现在在祥符禅寺入口附近，找厕所建议先从寺院安静参观区退回主游线，沿“卫生间 / WC / 游客服务中心”指示牌走。寺院内部请尽量保持安静，不要穿行殿堂找服务设施；回到主路或入口服务节点会更容易找到。',
};

const defaultRoute: KioskRouteGuide = {
  main:
    '如果你第一次来灵山胜境，我建议按“九龙灌浴、灵山大佛、祥符禅寺、梵宫或五印坛城”的顺序走。先看动态演绎，再看核心地标，最后进入寺院和建筑艺术空间，节奏会比较自然。',
  closing:
    '如果已经接近闭园，请优先确认自己离出口的位置，不要再临时增加远距离景点。可以沿主游线向游客服务中心和出口方向移动。',
  foodNearby:
    '餐食可以优先找游客服务中心、梵宫服务区或主餐饮点，素面、素斋和简餐比较适合游览中途补给。',
};

const defaultService: KioskServiceGuide = {
  restroom:
    '找厕所建议优先沿景区主游线寻找“卫生间 / WC / 游客服务中心”指示牌。大屏所在点位如果没有直接标识，就近询问工作人员最快；带老人、小朋友同行的话，建议先到游客服务中心或主服务区确认最近位置。',
};

const lingshanDafoVisual: KioskGuideVisual = {
  title: '灵山大佛图文导览',
  subtitle: '从高度、工艺到祈福动线，先看懂这尊地标大佛。',
  heroImage: '/image/bigfo.png',
  overview:
    '这段讲解按“远观气势、近看工艺、亲身祈福”的顺序展开。游客先建立灵山大佛的尺度感，再理解铜像与莲花座细节，最后把路线自然落到抱佛脚体验。',
  facts: ['通高约 88 米', '1997 年落成开光', '铜材约 725 吨'],
  metrics: [
    { value: '88m', label: '大佛通高', detail: '佛体 79 米、莲花座 9 米' },
    { value: '725t', label: '铜材用量', detail: '约两千多块铜壁板拼接' },
    { value: '101.5m', label: '含台基高度', detail: '从台基到佛顶形成完整仰望尺度' },
  ],
  cards: [
    {
      title: '核心地标',
      eyebrow: '看点 01',
      image: '/image/bigfo.png',
      body: '大佛面向太湖，第一眼先看整体轮廓、山水背景和中轴秩序，适合在广场中轴拍全景，再慢慢走近观察比例与气势。',
    },
    {
      title: '铜像工艺',
      eyebrow: '看点 02',
      image: '/image/history/exhibit-buddha-face.png',
      body: '佛体由两千多块铜壁板拼接而成，近看可留意衣纹起伏、莲花座层次和铜板衔接，理解“远看庄严、近看精工”的差别。',
    },
    {
      title: '抱佛脚祈福',
      eyebrow: '体验 03',
      image: '/image/foshou.png',
      body: '沿台阶上行后可体验“抱佛脚”，这不是单纯拍照点，而是把瞻礼、登高和祈福连在一起的核心体验。',
    },
  ],
  storyline: [
    { tag: '01', title: '先看远景', body: '从广场中轴抬头看大佛与太湖背景，建立尺度感。' },
    { tag: '02', title: '再看细节', body: '走近后观察衣纹、莲座、铜板拼接和佛足细节。' },
    { tag: '03', title: '最后体验', body: '体力允许时上行抱佛脚，再回望广场完成游览记忆点。' },
  ],
  tips: ['先拍全景，再上台阶看细节', '体力不足可在广场短暂停留', '下一站可去祥符禅寺或九龙灌浴'],
};

const nineDragonVisual: KioskGuideVisual = {
  title: '九龙灌浴图文导览',
  subtitle: '用一场动态演绎，看懂“花开见佛，九龙沐浴”。',
  heroImage: '/image/nine dragon.png',
  overview:
    '九龙灌浴的重点不只是喷泉，而是把释迦牟尼诞生典故做成可观看、可拍摄、可听讲的动态场景。讲解会先交代典故，再提醒游客站位和后续动线。',
  facts: ['佛诞典故演绎', '音乐喷泉互动', '中轴视角最佳'],
  metrics: [
    { value: '花开', label: '演绎起点', detail: '莲花开启后太子像升起' },
    { value: '九龙', label: '视觉核心', detail: '九条龙喷水形成环绕仪式感' },
    { value: '中轴', label: '推荐站位', detail: '稍靠后能同时看莲花与龙身' },
  ],
  cards: [
    {
      title: '花开见佛',
      eyebrow: '演绎 01',
      image: '/image/nine dragon.png',
      body: '演出开始后莲花打开，太子佛升起，这是整场演绎的情绪转折点。游客站在中轴稍靠后的位置，更容易看到完整开合过程。',
    },
    {
      title: '九龙吐水',
      eyebrow: '典故 02',
      image: '/image/history/art-tang-buddha.png',
      body: '九龙喷水来自释迦牟尼诞生传说，现场用喷泉、水雾和音乐把典故转成可视化体验，适合边看边听小景解释“九龙沐浴”的含义。',
    },
    {
      title: '动线衔接',
      eyebrow: '路线 03',
      image: '/image/baizi.png',
      body: '看完演出后可顺路前往灵山大佛，把佛诞典故和大佛瞻礼连成一条文化线；人多时先从喷泉核心区撤到外侧主路。',
    },
  ],
  storyline: [
    { tag: '01', title: '演出前', body: '提前到中轴稍靠后位置，占一个能看到莲花全景的视角。' },
    { tag: '02', title: '演出中', body: '关注莲花开启、太子像升起、九龙喷水三个连续动作。' },
    { tag: '03', title: '演出后', body: '离开人流核心区，顺主游线衔接灵山大佛或祥符禅寺。' },
  ],
  tips: ['演出前提前占中轴视角', '人多时先离开喷泉核心区', '看完可顺路去灵山大佛'],
};

const xiangfuTempleVisual: KioskGuideVisual = {
  title: '祥符禅寺图文导览',
  subtitle: '从唐代法脉到宋代赐额，放慢脚步看一座千年梵刹。',
  heroImage: '/image/xiangfu.png',
  overview:
    '祥符禅寺适合做“慢讲解”：它不是靠强视觉冲击取胜，而是靠唐代小灵山渊源、宋代赐额记忆和寺院礼佛空间串起文化深度。',
  facts: ['唐代小灵山渊源', '北宋祥符赐额', '安静礼佛空间'],
  metrics: [
    { value: '唐', label: '小灵山缘起', detail: '玄奘、窥基相关传说构成历史根脉' },
    { value: '宋', label: '祥符赐额', detail: '大中祥符年间留下寺名记忆' },
    { value: '静', label: '游览方式', detail: '降低音量，按山门与中轴空间慢行' },
  ],
  cards: [
    {
      title: '小灵山缘起',
      eyebrow: '历史 01',
      image: '/image/history/exhibit-lineage-cien.png',
      body: '相传玄奘法师见马山山形似印度灵鹫山，称这里为“小灵山”。这条传说让祥符禅寺不只是寺院，也是灵山地名与法脉的入口。',
    },
    {
      title: '祥符赐名',
      eyebrow: '历史 02',
      image: '/image/xiangfu.png',
      body: '北宋大中祥符年间，寺院获得“祥符禅寺”之名。讲解时可把唐代缘起与宋代赐额连起来，形成更完整的历史线。',
    },
    {
      title: '礼佛参观',
      eyebrow: '礼仪 03',
      image: '/image/history/exhibit-dharma-hall.png',
      body: '寺院适合慢行参观，进入殿堂和礼佛空间时请降低音量，观察山门、中轴和殿堂秩序，尊重现场礼佛氛围。',
    },
  ],
  storyline: [
    { tag: '01', title: '入寺前', body: '先听小灵山缘起，理解这座寺与灵山地名的关系。' },
    { tag: '02', title: '参观中', body: '沿山门与中轴空间慢行，观察殿堂与礼佛秩序。' },
    { tag: '03', title: '离开时', body: '从安静寺院过渡到大佛广场，形成“历史根脉到现代地标”的对照。' },
  ],
  tips: ['先看山门与中轴空间', '寺院内保持安静', '可作为大佛广场后的文化深度站'],
};

const defaultVisual: KioskGuideVisual = {
  title: '灵山胜境图文导览',
  subtitle: '先认识核心景点，再让小景为你规划下一站。',
  heroImage: '/image/AigcAssets(3).png',
  overview:
    '这是一份总览式讲解：先帮游客分清“地标、演绎、寺院、建筑艺术”四类体验，再根据时间和体力选择下一站。',
  facts: ['佛教文化主题景区', '太湖之滨', '适合半日到一日游'],
  metrics: [
    { value: '地标', label: '灵山大佛', detail: '拍全景、看工艺、体验祈福' },
    { value: '演绎', label: '九龙灌浴', detail: '音乐喷泉呈现佛诞典故' },
    { value: '文化', label: '祥符禅寺', detail: '慢行理解唐宋历史脉络' },
  ],
  cards: [
    {
      title: '灵山大佛',
      eyebrow: '地标 01',
      image: '/image/bigfo.png',
      body: '景区核心地标，适合拍全景、看铜像工艺，并体验祈福动线。',
    },
    {
      title: '九龙灌浴',
      eyebrow: '演绎 02',
      image: '/image/nine dragon.png',
      body: '用音乐喷泉演绎佛诞典故，是第一次来灵山很容易记住的动态景观。',
    },
    {
      title: '祥符禅寺',
      eyebrow: '文化 03',
      image: '/image/xiangfu.png',
      body: '承接唐宋历史脉络，适合放慢脚步感受寺院空间和礼佛文化。',
    },
  ],
  storyline: [
    { tag: '01', title: '第一次来', body: '优先看大佛与九龙灌浴，先抓住景区记忆点。' },
    { tag: '02', title: '想深度游', body: '加入祥符禅寺、梵宫或五印坛城，增加文化与建筑内容。' },
    { tag: '03', title: '时间有限', body: '只保留当前点位、最近演出和出口方向，避免来回折返。' },
  ],
  tips: ['第一次来优先看大佛与九龙灌浴', '时间充裕再去梵宫和五印坛城', '路线问题可以直接问小景'],
};

const expandedSpotSeeds: ExpandedSpotSeed[] = [
  {
    id: 'fan-gong',
    storySpotId: 'fan-gong',
    name: '灵山梵宫',
    shortName: '梵宫',
    subtitle: '佛教艺术宫殿与《吉祥颂》演出空间',
    locationHint: '当前点位 · 灵山梵宫入口',
    image: '/image/fangong.png',
    storyTitle: '走进梵宫艺术长廊',
    storyHint: '从建筑工艺、佛教艺术到吉祥颂演出',
    accent: '#B58A42',
    accentSoft: 'rgba(181,138,66,0.18)',
    greeting:
      '欢迎来到灵山梵宫。我是小景，可以带你看建筑艺术、传统工艺、吉祥颂演出和后续游览路线。想先听总览，点“讲讲这里”就好。',
    guideScript:
      '这里是灵山梵宫，被很多游客称作佛教艺术的宫殿。它于2009年开放，曾作为世界佛教论坛的重要会场。参观时可以先看整体建筑气势，再进入内部留意东阳木雕、敦煌壁画、扬州漆器、景泰蓝须弥灯等传统工艺。梵宫里最有记忆点的是圣坛空间和《吉祥颂》演出，灯光、水雾、音乐和舞台调度会把佛陀修行成佛的故事做成沉浸式体验。建议你预留更完整的时间慢慢看，不要只拍门口就离开。',
    guideVisual: {
      title: '灵山梵宫图文导览',
      subtitle: '看建筑、工艺与演出，理解“佛教艺术宫殿”的层次。',
      heroImage: '/image/fangong.png',
      overview:
        '梵宫适合按“外观气势、内部工艺、圣坛演出”的顺序观看。它不是单一景点，而是建筑、佛教艺术和舞台科技结合的综合体验。',
      facts: ['2009 年开放', '世界佛教论坛会场', '《吉祥颂》演出空间'],
      metrics: [
        { value: '艺术', label: '核心看点', detail: '木雕、壁画、漆器、景泰蓝等工艺汇集' },
        { value: '圣坛', label: '演出空间', detail: '灯光、水雾和音乐共同营造沉浸体验' },
        { value: '慢看', label: '建议节奏', detail: '至少预留完整参观时间，不只打卡外观' },
      ],
      cards: [
        {
          title: '建筑气势',
          eyebrow: '看点 01',
          image: '/image/fangong.png',
          body: '先从外部观察梵宫体量和轴线，它用现代建筑语言承接佛教宫殿的庄严感，是进入内部艺术空间前的第一层铺垫。',
        },
        {
          title: '传统工艺',
          eyebrow: '看点 02',
          image: '/image/history/exhibit-dharma-hall.png',
          body: '内部可重点看木雕、壁画、漆器和景泰蓝等细节，把“好看”进一步拆成可讲解的材料、纹样和工艺。',
        },
        {
          title: '吉祥颂演出',
          eyebrow: '体验 03',
          image: '/image/history/light-rays-fan.png',
          body: '如果赶上演出，建议把梵宫作为本段路线的重头戏，用舞台科技理解佛陀修行成佛的故事。',
        },
      ],
      storyline: [
        { tag: '01', title: '先看外观', body: '在入口处建立建筑尺度感，观察对称秩序与宫殿气势。' },
        { tag: '02', title: '再看工艺', body: '进入后放慢脚步，看木雕、壁画、灯具和装饰纹样。' },
        { tag: '03', title: '最后看演出', body: '有演出场次时优先确认时间，避免错过核心体验。' },
      ],
      tips: ['先确认《吉祥颂》场次', '内部参观请留意动线和工作人员提示', '时间紧张时优先看圣坛与主厅'],
    },
    routeMain:
      '你现在在灵山梵宫。若刚看完内部艺术空间，建议下一站去五印坛城，对比汉传与藏传佛教建筑；如果还没看灵山大佛，可以回到主游线前往大佛广场，把艺术建筑和核心地标串起来。',
    routeClosing:
      '如果接近闭园，梵宫参观后建议直接沿主游线往出口或游客服务区移动，不再增加远距离支线。',
    foodNearby:
      '梵宫及游客服务区周边相对更容易找到餐饮和补给，适合作为中途休息点。',
    restroom:
      '你现在在灵山梵宫附近，找卫生间建议优先看入口、出口和游客服务区方向的“卫生间 / WC”标识，建筑内部请按现场指引行走。',
    idleTitle: '在梵宫看见佛教艺术',
    idleSubtitle: '问我建筑工艺、演出时间、参观顺序，或让小景安排下一站。',
    ambientTags: ['佛教艺术', '吉祥颂', '建筑工艺', '演出场次'],
  },
  {
    id: 'wu-yin-tan-cheng',
    storySpotId: 'wu-yin-tan-cheng',
    name: '五印坛城',
    shortName: '五印坛城',
    subtitle: '藏传佛教建筑与转经祈福体验',
    locationHint: '当前点位 · 五印坛城',
    image: '/image/wuyin.png',
    storyTitle: '读懂坛城里的藏传文化',
    storyHint: '从建筑、唐卡到转经筒体验',
    accent: '#9A5DA8',
    accentSoft: 'rgba(154,93,168,0.18)',
    greeting:
      '欢迎来到五印坛城。我是小景，可以为你讲解坛城建筑、转经筒、唐卡艺术和参观礼仪。这里适合慢慢看，也适合亲手体验转经祈福。',
    guideScript:
      '五印坛城展现的是藏传佛教文化。你可以先看它鲜明的藏式建筑色彩和层层递进的空间，再留意唐卡、装饰纹样和转经廊。转经筒是这里很重要的互动体验，游客可以顺着动线转动经筒，感受“转经一圈，福慧双增”的祈福寓意。讲解时可以把这里和梵宫、大佛做对比：大佛强调地标和瞻礼，梵宫强调艺术综合空间，而五印坛城更适合体验藏传佛教的建筑、图像和仪式感。',
    guideVisual: {
      title: '五印坛城图文导览',
      subtitle: '用建筑、唐卡和转经筒，看懂藏传佛教文化。',
      heroImage: '/image/wuyin.png',
      overview:
        '五印坛城的讲解重点在“看差异”：从色彩、空间、唐卡和转经筒中理解藏传佛教与景区其他汉传佛教空间的不同。',
      facts: ['藏传佛教文化', '转经筒体验', '坛城建筑意象'],
      metrics: [
        { value: '坛城', label: '空间主题', detail: '以曼茶罗意象组织建筑与参观动线' },
        { value: '转经', label: '互动体验', detail: '顺动线转动经筒，体验祈福仪式感' },
        { value: '唐卡', label: '图像艺术', detail: '通过色彩与图像理解藏传佛教审美' },
      ],
      cards: [
        {
          title: '藏式建筑',
          eyebrow: '看点 01',
          image: '/image/wuyin.png',
          body: '先看建筑颜色、层次和装饰，它和梵宫、大佛广场的视觉语言明显不同，是理解藏传文化的入口。',
        },
        {
          title: '转经祈福',
          eyebrow: '体验 02',
          image: '/image/wuyin.png',
          body: '转经筒是这里最适合游客参与的体验。请顺着现场动线慢慢转动，注意不要逆行或影响他人参观。',
        },
        {
          title: '唐卡图像',
          eyebrow: '艺术 03',
          image: '/image/history/art-ming-ceremony.png',
          body: '唐卡和装饰纹样适合边看边讲颜色、人物和象征意义，让视觉细节变成可理解的文化内容。',
        },
      ],
      storyline: [
        { tag: '01', title: '先看建筑', body: '从外观色彩和空间层次进入藏传佛教语境。' },
        { tag: '02', title: '再体验转经', body: '按现场动线参与转经筒祈福，感受仪式感。' },
        { tag: '03', title: '最后看图像', body: '观察唐卡和纹样，把艺术细节和宗教寓意连起来。' },
      ],
      tips: ['转经请跟随现场方向', '适合与梵宫形成建筑对比', '拍照时避免影响其他游客'],
    },
    routeMain:
      '你现在在五印坛城。建议先完整看完转经廊和唐卡空间，再前往梵宫继续看佛教艺术建筑；如果时间有限，也可以沿主路回到游客服务区和出口方向。',
    routeClosing:
      '临近闭园时，五印坛城不建议再深入支线。请沿主游线向出口或服务区移动。',
    foodNearby:
      '五印坛城周边建议向梵宫服务区或游客服务中心方向寻找餐饮和休息点。',
    restroom:
      '你现在在五印坛城附近，找厕所建议从坛城出口回到主游线，沿“卫生间 / WC / 游客服务中心”标识前往服务节点。',
    idleTitle: '转一卷坛城祈福',
    idleSubtitle: '问我转经筒怎么体验、唐卡怎么看，或下一站去哪里。',
    ambientTags: ['藏传佛教', '转经筒', '唐卡', '坛城建筑'],
  },
  {
    id: 'fo-shou-guang-chang',
    storySpotId: 'fo-shou-guang-chang',
    name: '佛手广场',
    shortName: '佛手广场',
    subtitle: '天下第一掌与摸佛手祈福体验',
    locationHint: '当前点位 · 佛手广场',
    image: '/image/foshou.png',
    storyTitle: '摸佛手，沾福气',
    storyHint: '理解天下第一掌和灵山祈福体验',
    accent: '#C9823D',
    accentSoft: 'rgba(201,130,61,0.18)',
    greeting:
      '欢迎来到佛手广场。我是小景，这里最适合讲“摸佛手、抱佛脚”的祈福体验。需要拍照角度、亲子玩法或下一站路线，可以直接问我。',
    guideScript:
      '这里是佛手广场，最醒目的就是“天下第一掌”。它是灵山大佛右手的复制品，高11.7米、宽5.5米。游客常说“摸佛手，沾福气”，这和大佛平台上的“抱佛脚”一起构成灵山两大祈福体验。参观时可以先看佛手比例，再让孩子观察手掌纹路和姿态，最后按秩序排队触摸祈福。这里也很适合作为亲子路线的互动节点，把宏大的大佛文化变成孩子能参与、能记住的动作体验。',
    guideVisual: {
      title: '佛手广场图文导览',
      subtitle: '摸佛手、抱佛脚，把祈福体验变成可参与的记忆点。',
      heroImage: '/image/foshou.png',
      overview:
        '佛手广场的重点是“参与感”。它把大佛的象征意义转成游客可以触摸、拍照和讲给孩子听的互动体验。',
      facts: ['高约 11.7 米', '宽约 5.5 米', '天下第一掌'],
      metrics: [
        { value: '11.7m', label: '佛手高度', detail: '巨大的比例帮助游客感受大佛尺度' },
        { value: '5.5m', label: '佛手宽度', detail: '适合近距离观察掌纹与造型' },
        { value: '祈福', label: '核心体验', detail: '摸佛手与抱佛脚形成灵山祈福动线' },
      ],
      cards: [
        {
          title: '天下第一掌',
          eyebrow: '看点 01',
          image: '/image/foshou.png',
          body: '佛手比例巨大，适合从远处看整体，再走近看掌纹和姿态，感受大佛右手复制品的尺度。',
        },
        {
          title: '摸佛手祈福',
          eyebrow: '体验 02',
          image: '/image/history/particle-gold-dust.png',
          body: '摸佛手寓意沾福气、保平安。人多时请排队体验，给老人和小朋友留出安全空间。',
        },
        {
          title: '亲子互动',
          eyebrow: '亲子 03',
          image: '/image/baizi.png',
          body: '这里很适合给孩子讲“为什么手掌这么大”，再衔接大佛平台的抱佛脚体验。',
        },
      ],
      storyline: [
        { tag: '01', title: '看比例', body: '先站远一点看佛手整体比例，理解它来自灵山大佛右手。' },
        { tag: '02', title: '摸佛手', body: '按秩序触摸祈福，感受灵山祈福体验的参与感。' },
        { tag: '03', title: '接大佛', body: '后续可前往大佛平台，把摸佛手和抱佛脚连成完整体验。' },
      ],
      tips: ['人多时排队触摸', '适合亲子拍照', '下一站可接灵山大佛或百子戏弥勒'],
    },
    routeMain:
      '你现在在佛手广场。亲子或祈福路线可以先在这里摸佛手，再前往灵山大佛体验抱佛脚；如果带小朋友，也可以转去百子戏弥勒，节奏更轻松。',
    routeClosing:
      '接近闭园时，佛手广场适合快速祈福和拍照收尾，然后沿主路往出口方向走。',
    foodNearby:
      '佛手广场以短暂停留为主，餐饮和休息建议向游客服务中心、梵宫服务区或主服务点移动。',
    restroom:
      '你现在在佛手广场附近，找厕所建议回到广场外侧主游线，沿“卫生间 / WC”标识或向工作人员确认最近服务点。',
    idleTitle: '摸佛手，沾福气',
    idleSubtitle: '问我祈福寓意、亲子玩法、拍照角度，或下一站怎么走。',
    ambientTags: ['摸佛手', '祈福体验', '亲子互动', '拍照点'],
  },
  {
    id: 'bai-zi-xi-mi-le',
    storySpotId: 'bai-zi-xi-mi-le',
    name: '百子戏弥勒',
    shortName: '百子戏弥勒',
    subtitle: '童趣雕塑与皆大欢喜的亲子点位',
    locationHint: '当前点位 · 百子戏弥勒',
    image: '/image/baizi.png',
    storyTitle: '在笑声里看弥勒',
    storyHint: '从百子雕塑看佛教文化的亲和表达',
    accent: '#D59A3D',
    accentSoft: 'rgba(213,154,61,0.18)',
    greeting:
      '欢迎来到百子戏弥勒。我是小景，这里最适合亲子互动、拍照和轻松讲解“皆大欢喜”的寓意。想找下一站或附近服务，也可以问我。',
    guideScript:
      '百子戏弥勒是一处很适合亲子停留的雕塑景观。弥勒佛笑容可掬，周围许多孩童形态各异，有的嬉戏、有的攀爬、有的互动，整体传达“皆大欢喜”的生活态度。给孩子讲解时，不需要一开始讲复杂佛理，可以先让孩子找一找不同孩童的动作和表情，再引出弥勒所代表的包容、欢乐和豁达。这里也是亲子路线中非常轻松的拍照点。',
    guideVisual: {
      title: '百子戏弥勒图文导览',
      subtitle: '用童趣雕塑讲“皆大欢喜”，亲子路线的轻松一站。',
      heroImage: '/image/baizi.png',
      overview:
        '百子戏弥勒适合用“找表情、看动作、讲寓意”的方式导览，让小朋友先参与观察，再理解佛教文化里亲和、包容的一面。',
      facts: ['亲子友好', '大型青铜雕塑', '皆大欢喜寓意'],
      metrics: [
        { value: '百子', label: '雕塑主题', detail: '孩童形态各异，适合观察互动' },
        { value: '弥勒', label: '文化寓意', detail: '笑口常开，体现包容与欢乐' },
        { value: '拍照', label: '游览方式', detail: '适合亲子合影和轻松停留' },
      ],
      cards: [
        {
          title: '童趣细节',
          eyebrow: '看点 01',
          image: '/image/baizi.png',
          body: '让孩子找一找不同孩童的动作和表情，比直接讲解更容易产生参与感。',
        },
        {
          title: '皆大欢喜',
          eyebrow: '寓意 02',
          image: '/image/history/art-song-garden.png',
          body: '弥勒的笑容传达包容与豁达，可以用轻松语言解释“开心、宽容、分享”的意义。',
        },
        {
          title: '亲子路线',
          eyebrow: '路线 03',
          image: '/image/foshou.png',
          body: '这里可与佛手广场、九龙灌浴串联，形成孩子能看、能玩、能听懂的路线。',
        },
      ],
      storyline: [
        { tag: '01', title: '先找动作', body: '让孩子观察孩童雕塑的不同姿态和表情。' },
        { tag: '02', title: '再讲寓意', body: '从弥勒笑容引出“皆大欢喜”的生活态度。' },
        { tag: '03', title: '最后拍照', body: '选择不影响通行的位置完成亲子合影。' },
      ],
      tips: ['适合亲子停留', '拍照时注意避让通道', '可接佛手广场或九龙灌浴'],
    },
    routeMain:
      '你现在在百子戏弥勒。带孩子的话，建议继续去佛手广场做摸佛手互动，或者回到九龙灌浴看动态演出；如果想看核心地标，再前往灵山大佛。',
    routeClosing:
      '如果接近闭园，这里适合轻松收尾拍照，然后顺主路向出口方向移动。',
    foodNearby:
      '百子戏弥勒周边更适合短暂停留，餐饮休息建议向游客服务中心或主服务区方向走。',
    restroom:
      '你现在在百子戏弥勒附近，找厕所建议沿主游线观察“卫生间 / WC”指示牌，带小朋友时优先前往游客服务区确认。',
    idleTitle: '和弥勒一起笑一笑',
    idleSubtitle: '问我雕塑寓意、亲子玩法、拍照点，或下一站去哪。',
    ambientTags: ['亲子拍照', '弥勒寓意', '轻松路线', '互动观察'],
  },
  {
    id: 'man-fei-long-ta',
    storySpotId: 'man-fei-long-ta',
    name: '曼飞龙塔',
    shortName: '曼飞龙塔',
    subtitle: '傣族佛教建筑与自然园林景观',
    locationHint: '当前点位 · 曼飞龙塔',
    image: '/image/manfeilong.png',
    storyTitle: '看一座异域佛塔',
    storyHint: '理解傣族佛教建筑与自然环境的融合',
    accent: '#5C9A68',
    accentSoft: 'rgba(92,154,104,0.18)',
    greeting:
      '欢迎来到曼飞龙塔。我是小景，这里适合看傣族佛教建筑、园林景观和自然风光。如果你想走得轻松一点，我也可以帮你规划下一站。',
    guideScript:
      '曼飞龙塔采用傣族佛教建筑风格，和灵山大佛、梵宫、五印坛城的视觉气质都不一样。这里的重点不是宏大体量，而是建筑与园林、自然环境之间的协调。你可以先看塔身轮廓和装饰，再观察它与周围植物、山水背景的关系。讲解时可以把这里作为自然风光路线中的一站，让游客从大佛的庄严转入更轻松的园林漫步。',
    guideVisual: {
      title: '曼飞龙塔图文导览',
      subtitle: '看傣族佛教建筑怎样融入灵山园林与自然风光。',
      heroImage: '/image/manfeilong.png',
      overview:
        '曼飞龙塔适合做自然风光路线中的“建筑小景”。它的价值在于风格差异和环境融合，而不是单纯追求宏大。',
      facts: ['傣族佛教风格', '园林景观融合', '自然风光路线'],
      metrics: [
        { value: '塔', label: '建筑主题', detail: '塔身轮廓体现傣族佛教建筑特色' },
        { value: '林', label: '环境关系', detail: '与周围植物和山水背景形成层次' },
        { value: '慢游', label: '推荐节奏', detail: '适合自然路线中短暂停留拍照' },
      ],
      cards: [
        {
          title: '异域佛塔',
          eyebrow: '看点 01',
          image: '/image/manfeilong.png',
          body: '先看塔身轮廓和装饰风格，和汉传佛教建筑、藏式坛城形成明显对比。',
        },
        {
          title: '园林融合',
          eyebrow: '看点 02',
          image: '/image/history/art-song-garden.png',
          body: '观察佛塔与树木、山体、水系之间的关系，这里适合用“景在林中”的方式讲解。',
        },
        {
          title: '自然慢游',
          eyebrow: '体验 03',
          image: '/image/puti.png',
          body: '它可与菩提大道、灵山精舍衔接，形成更安静、更自然的一段路线。',
        },
      ],
      storyline: [
        { tag: '01', title: '先看塔形', body: '观察塔身轮廓、色彩和装饰，识别风格差异。' },
        { tag: '02', title: '再看环境', body: '把佛塔放进山水园林背景中理解。' },
        { tag: '03', title: '最后接线', body: '后续可往灵山精舍或菩提大道慢行。' },
      ],
      tips: ['适合自然路线停留', '拍照注意取塔与树的关系', '可接灵山精舍或大佛方向'],
    },
    routeMain:
      '你现在在曼飞龙塔。建议继续走自然风光路线，前往灵山精舍感受禅意园林；如果想回到核心地标，也可以向灵山大佛方向移动。',
    routeClosing:
      '临近闭园时，不建议继续深入支线，可从曼飞龙塔沿主游线向大佛广场或出口方向回撤。',
    foodNearby:
      '曼飞龙塔周边以景观游览为主，餐饮和休息建议向灵山精舍、梵宫服务区或游客服务中心方向确认。',
    restroom:
      '你现在在曼飞龙塔附近，找厕所建议先回到主游线节点，沿“卫生间 / WC”标识前往服务点。',
    idleTitle: '在曼飞龙塔慢慢看',
    idleSubtitle: '问我建筑风格、自然路线、拍照角度，或下一站怎么走。',
    ambientTags: ['傣族佛塔', '自然风光', '园林融合', '慢游路线'],
  },
  {
    id: 'ling-shan-jing-she',
    storySpotId: 'ling-shan-jing-she',
    name: '灵山精舍',
    shortName: '灵山精舍',
    subtitle: '禅意住宿、素斋与园林体验',
    locationHint: '当前点位 · 灵山精舍',
    image: '/image/jingshe.png',
    storyTitle: '在精舍里体验禅意生活',
    storyHint: '从素斋、早课到园林慢游',
    accent: '#6A9C89',
    accentSoft: 'rgba(106,156,137,0.18)',
    greeting:
      '欢迎来到灵山精舍。我是小景，这里适合了解禅意生活、素斋、园林和深度体验路线。想找休息或餐饮，也可以直接问我。',
    guideScript:
      '灵山精舍是景区内偏安静、偏深度体验的点位。它和大佛、九龙灌浴的热闹不同，更适合慢下来感受禅意生活。这里有素斋、早课和园林空间，能让游客从“看景点”转向“体验一种生活方式”。如果你已经走了较长路线，可以在这里休息、补给，再决定是继续自然风光线，还是向出口方向收尾。',
    guideVisual: {
      title: '灵山精舍图文导览',
      subtitle: '把游览节奏放慢，体验素斋、园林与禅意生活。',
      heroImage: '/image/jingshe.png',
      overview:
        '灵山精舍的价值在“停下来”。它适合补充体力，也适合把佛教文化从建筑与仪式延伸到饮食、作息和园林生活。',
      facts: ['禅意酒店', '素斋体验', '早课与园林'],
      metrics: [
        { value: '素斋', label: '饮食体验', detail: '感受清淡雅致的佛门饮食文化' },
        { value: '早课', label: '深度体验', detail: '适合愿意慢游和住宿的游客' },
        { value: '园林', label: '空间氛围', detail: '用安静环境承接自然风光路线' },
      ],
      cards: [
        {
          title: '禅意生活',
          eyebrow: '体验 01',
          image: '/image/jingshe.png',
          body: '这里更像从景点游览进入生活体验，适合讲“慢下来、住下来、静下来”。',
        },
        {
          title: '素斋补给',
          eyebrow: '服务 02',
          image: '/image/history/exhibit-tea-art.jpg',
          body: '素斋是精舍的重要记忆点，适合中途补给，也能延伸出佛门饮食文化讲解。',
        },
        {
          title: '园林慢行',
          eyebrow: '路线 03',
          image: '/image/history/art-song-garden.png',
          body: '周边环境适合慢行休息，可和曼飞龙塔、菩提大道组成自然风光段落。',
        },
      ],
      storyline: [
        { tag: '01', title: '先休息', body: '如果体力下降，这里适合补水、休息和调整节奏。' },
        { tag: '02', title: '再体验', body: '了解素斋、早课和禅意生活的文化内涵。' },
        { tag: '03', title: '最后规划', body: '根据时间选择继续自然线或向出口收尾。' },
      ],
      tips: ['适合中途休息', '可咨询素斋开放情况', '深度游游客可重点停留'],
    },
    routeMain:
      '你现在在灵山精舍。体力充足的话，可以继续自然风光路线前往曼飞龙塔或菩提大道；如果已经偏晚，建议把这里作为休息收尾点，再向出口方向移动。',
    routeClosing:
      '临近闭园时，精舍适合作为安静收尾点，请不要再临时增加远距离点位。',
    foodNearby:
      '灵山精舍本身适合咨询素斋和休息服务，具体营业情况以现场提示为准。',
    restroom:
      '你现在在灵山精舍附近，找厕所建议优先看精舍服务区、入口和主游线节点的标识。',
    idleTitle: '在精舍里慢下来',
    idleSubtitle: '问我素斋、休息、禅意体验，或如何安排收尾路线。',
    ambientTags: ['素斋', '禅意生活', '休息补给', '自然路线'],
  },
  {
    id: 'ling-shan-da-zhao-bi',
    storySpotId: 'ling-shan-da-zhao-bi',
    name: '灵山大照壁',
    shortName: '大照壁',
    subtitle: '景区入口大型浮雕与华夏第一壁',
    locationHint: '当前点位 · 灵山大照壁',
    image: '/image/zhaobi.png',
    storyTitle: '从大照壁进入灵山',
    storyHint: '看入口浮雕如何展开灵山胜境主题',
    accent: '#A96A3E',
    accentSoft: 'rgba(169,106,62,0.18)',
    greeting:
      '欢迎来到灵山大照壁。我是小景，这里是进入灵山胜境前很重要的开场景观。我可以为你讲浮雕看点、入口动线和第一站怎么走。',
    guideScript:
      '灵山大照壁是景区入口的标志性景观，全长39.8米，最高处7米，最厚处1.9米，被称为“华夏第一壁”。中间的大型浮雕以“灵山胜境”为主题，把佛教文化、山水环境和景区气象先做了一次视觉开场。这里适合作为游览第一讲：先看整体长度和气势，再看浮雕层次，最后从这里进入主游线，前往九龙灌浴、佛手广场或灵山大佛。',
    guideVisual: {
      title: '灵山大照壁图文导览',
      subtitle: '从入口浮雕开始，给整段灵山游览定下开场。',
      heroImage: '/image/zhaobi.png',
      overview:
        '大照壁是“入园第一眼”。讲解重点不是停留很久，而是帮助游客建立景区主题和接下来主游线方向。',
      facts: ['全长 39.8 米', '最高约 7 米', '华夏第一壁'],
      metrics: [
        { value: '39.8m', label: '照壁全长', detail: '横向展开入口视觉气势' },
        { value: '7m', label: '最高处', detail: '形成入园前的开场尺度' },
        { value: '1.9m', label: '最厚处', detail: '深浮雕石材拼块带来厚重感' },
      ],
      cards: [
        {
          title: '入口开场',
          eyebrow: '看点 01',
          image: '/image/zhaobi.png',
          body: '大照壁像一段序章，先把游客从普通入口带入“灵山胜境”的文化语境。',
        },
        {
          title: '浮雕层次',
          eyebrow: '看点 02',
          image: '/image/history/exhibit-moya-detail.png',
          body: '近看可观察浮雕的层次、人物和山水关系，把“宏大”拆成具体图像。',
        },
        {
          title: '主线起点',
          eyebrow: '路线 03',
          image: '/image/nine dragon.png',
          body: '从这里适合顺主游线进入九龙灌浴、佛手广场，再逐步接近灵山大佛。',
        },
      ],
      storyline: [
        { tag: '01', title: '看整体', body: '先站远一点看照壁横向展开的气势。' },
        { tag: '02', title: '看浮雕', body: '再靠近观察主题浮雕和石材层次。' },
        { tag: '03', title: '接主线', body: '讲完后顺主路进入九龙灌浴或大佛方向。' },
      ],
      tips: ['适合作为入园第一讲', '拍照注意不要堵住入口通道', '下一站可去九龙灌浴'],
    },
    routeMain:
      '你现在在灵山大照壁。建议顺主游线先去九龙灌浴看动态演绎，再到佛手广场和灵山大佛，形成从入口开场到核心地标的完整路线。',
    routeClosing:
      '如果接近闭园还在大照壁附近，建议优先确认出口和集合点，不再深入景区。',
    foodNearby:
      '大照壁附近以入口和通行动线为主，餐饮休息建议向游客服务中心或主服务区确认。',
    restroom:
      '你现在在灵山大照壁附近，找厕所建议优先看入口游客服务区、检票口外侧或主游线起点的卫生间标识。',
    idleTitle: '从大照壁进入灵山',
    idleSubtitle: '问我浮雕看点、入口路线，或第一站怎么安排。',
    ambientTags: ['入口开场', '浮雕', '华夏第一壁', '主游线'],
  },
  {
    id: 'pu-ti-da-dao',
    storySpotId: 'pu-ti-da-dao',
    name: '菩提大道',
    shortName: '菩提大道',
    subtitle: '太湖风光、菩提树影与山水格局',
    locationHint: '当前点位 · 菩提大道',
    image: '/image/puti.png',
    storyTitle: '沿菩提大道慢慢走',
    storyHint: '从林荫、太湖到风水格局看自然文化融合',
    accent: '#5F9D62',
    accentSoft: 'rgba(95,157,98,0.18)',
    greeting:
      '欢迎来到菩提大道。我是小景，这里适合边走边听自然风光和佛教植物寓意。想知道下一站去哪、哪里适合拍照，可以直接问我。',
    guideScript:
      '菩提大道是一段适合慢走的林荫步道。两侧菩提树枝叶交错，象征佛教文化的繁荣与清净。这里还可以欣赏太湖与青龙山、白虎山的自然风貌，感受“前有照、后有靠、左右有抱”的山水格局。走这段路时不要只赶路，可以放慢脚步看树影、远山和水面变化，让佛教文化与自然环境在行走中慢慢融合。',
    guideVisual: {
      title: '菩提大道图文导览',
      subtitle: '在树影和太湖风光里，走一段安静的自然文化线。',
      heroImage: '/image/puti.png',
      overview:
        '菩提大道的讲解重点是“边走边看”。它连接景点，也承载自然风光、植物寓意和山水格局。',
      facts: ['菩提树林荫', '太湖风光', '山水格局'],
      metrics: [
        { value: '菩提', label: '植物寓意', detail: '象征觉悟、清净与佛教文化繁荣' },
        { value: '太湖', label: '远景资源', detail: '可看湖面、山体和天空层次' },
        { value: '慢行', label: '推荐方式', detail: '适合边走边听讲解，避免只赶路' },
      ],
      cards: [
        {
          title: '林荫步道',
          eyebrow: '看点 01',
          image: '/image/puti.png',
          body: '树影、枝叶和道路形成安静的行走空间，适合把脚步放慢。',
        },
        {
          title: '太湖远景',
          eyebrow: '看点 02',
          image: '/image/bg-mountain-clean.png',
          body: '行走中可留意太湖与山体关系，理解景区为什么强调山水格局。',
        },
        {
          title: '自然过渡',
          eyebrow: '路线 03',
          image: '/image/manfeilong.png',
          body: '它适合连接大佛、曼飞龙塔和灵山精舍，让路线从核心地标转向自然慢游。',
        },
      ],
      storyline: [
        { tag: '01', title: '先看树影', body: '观察两侧菩提树和道路形成的林荫空间。' },
        { tag: '02', title: '再看远山', body: '抬头看太湖、青龙山和白虎山的自然层次。' },
        { tag: '03', title: '最后接线', body: '根据体力选择去大佛、曼飞龙塔或灵山精舍。' },
      ],
      tips: ['适合慢行听讲', '夏季注意补水遮阳', '可接自然风光路线'],
    },
    routeMain:
      '你现在在菩提大道。建议根据体力选择：想看地标就前往灵山大佛，想继续自然慢游就去曼飞龙塔或灵山精舍。',
    routeClosing:
      '临近闭园时，菩提大道不要继续深入远端支线，建议沿主游线回到出口方向。',
    foodNearby:
      '菩提大道以步行为主，餐饮和休息建议向灵山精舍、梵宫服务区或游客服务中心方向确认。',
    restroom:
      '你现在在菩提大道附近，找厕所建议先确认最近主游线节点，再沿“卫生间 / WC”标识前往服务区。',
    idleTitle: '沿菩提大道慢慢走',
    idleSubtitle: '问我植物寓意、太湖风光、下一站路线，或附近服务。',
    ambientTags: ['自然风光', '菩提树', '太湖', '慢行路线'],
  },
  {
    id: 'san-sheng-dian',
    storySpotId: 'san-sheng-dian',
    name: '三圣殿',
    shortName: '三圣殿',
    subtitle: '佛教历史文化展示空间',
    locationHint: '当前点位 · 三圣殿',
    image: '/image/sansheng.png',
    storyTitle: '在三圣殿梳理佛教文化线',
    storyHint: '从展示内容理解灵山文化传承',
    accent: '#7D6AA8',
    accentSoft: 'rgba(125,106,168,0.18)',
    greeting:
      '欢迎来到三圣殿。我是小景，这里适合梳理佛教历史文化和灵山胜境的发展脉络。如果你想接梵宫或五印坛城，我也可以帮你安排。',
    guideScript:
      '三圣殿是佛教历史文化展示的重要空间，适合在游览后段帮助游客梳理灵山胜境的文化脉络。这里不像大佛那样强调宏大地标，也不像九龙灌浴那样强调动态演绎，更适合静态阅读、理解和回顾。你可以把它看作一处文化总结点：前面看到的大佛、寺院、梵宫和坛城，都可以在这里回到佛教历史与文化传承的线索中。',
    guideVisual: {
      title: '三圣殿图文导览',
      subtitle: '把前面看到的景点，串回佛教历史文化脉络。',
      heroImage: '/image/sansheng.png',
      overview:
        '三圣殿适合作为文化总结点。游客在这里可以从“看热闹”转向“看脉络”，理解灵山胜境为何是综合性佛教文化景区。',
      facts: ['文化展示空间', '佛教历史脉络', '后段总结点'],
      metrics: [
        { value: '展陈', label: '游览方式', detail: '以静态阅读和文化理解为主' },
        { value: '脉络', label: '讲解重点', detail: '串联大佛、寺院、梵宫和坛城' },
        { value: '收束', label: '路线角色', detail: '适合深度文化路线后段停留' },
      ],
      cards: [
        {
          title: '历史展示',
          eyebrow: '看点 01',
          image: '/image/sansheng.png',
          body: '这里更适合安静阅读和听讲解，用展陈内容梳理佛教文化传承。',
        },
        {
          title: '文化串联',
          eyebrow: '看点 02',
          image: '/image/history/exhibit-map-zen-spread.jpg',
          body: '可把大佛、祥符禅寺、梵宫和五印坛城都串回同一条文化线中。',
        },
        {
          title: '深度路线',
          eyebrow: '路线 03',
          image: '/image/fangong.png',
          body: '它适合历史文化爱好者路线，不一定适合赶时间的游客长时间停留。',
        },
      ],
      storyline: [
        { tag: '01', title: '先看展陈', body: '按展陈顺序理解佛教历史与灵山文化主题。' },
        { tag: '02', title: '再做串联', body: '把已游览景点放回文化传承脉络。' },
        { tag: '03', title: '最后收束', body: '根据时间选择去梵宫、五印坛城或出口方向。' },
      ],
      tips: ['适合文化深度游客', '参观时保持安静', '时间紧张可缩短停留'],
    },
    routeMain:
      '你现在在三圣殿。文化深度路线可以继续去梵宫或五印坛城，做建筑艺术与文化展示的对照；如果已经偏晚，建议向出口方向收尾。',
    routeClosing:
      '接近闭园时，三圣殿适合作为最后的文化总结点，不建议再加远距离路线。',
    foodNearby:
      '三圣殿周边以参观为主，餐饮休息建议向梵宫服务区或游客服务中心方向移动。',
    restroom:
      '你现在在三圣殿附近，找厕所建议回到主游线，沿“卫生间 / WC / 游客服务中心”指示前往服务节点。',
    idleTitle: '在三圣殿梳理文化线',
    idleSubtitle: '问我展陈重点、文化脉络，或下一站怎么安排。',
    ambientTags: ['文化展示', '佛教历史', '深度路线', '静态参观'],
  },
];

function createExpandedSpot(seed: ExpandedSpotSeed): KioskSpotConfig {
  return {
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    subtitle: seed.subtitle,
    locationHint: seed.locationHint,
    backgroundImage: seed.image,
    storySpotId: seed.storySpotId,
    storyCoverImage: seed.image,
    storyTitle: seed.storyTitle,
    storyHint: seed.storyHint,
    accent: seed.accent,
    accentSoft: seed.accentSoft,
    greeting: seed.greeting,
    guideScript: seed.guideScript,
    guideVisual: seed.guideVisual,
    routeGuide: {
      main: seed.routeMain,
      closing: seed.routeClosing,
      foodNearby: seed.foodNearby,
    },
    serviceGuide: {
      restroom: seed.restroom,
    },
    idleTitle: seed.idleTitle,
    idleSubtitle: seed.idleSubtitle,
    ambientTags: seed.ambientTags,
    actions: defaultActions(seed.name),
  };
}

const P1_SPOT_DETAIL_POLISH: Record<string, KioskSpotDetailPolish> = {
  'ling-shan-da-fo': {
    guideScript:
      '你现在看到的是灵山胜境最有震撼力的地标——灵山大佛。它通高88米，1997年11月15日落成开光，佛体由青铜铸造，远看庄严，走近后能看到衣纹、莲花座和铜板拼接的细节。大佛右手作施无畏印，像是在告诉游客“不要害怕”；左手作与愿印，寓意把安宁和祝福带给大家。登云道共有216级台阶，可以把它理解成把108种烦恼放下、把108个愿望带上去。建议先在广场中轴拍全景，再沿台阶上行抱佛脚，最后回望太湖和马山，把地标、祈福和山水一口气看完整。',
    guideVisual: {
      overview:
        '大佛讲解要抓住三层：先看88米高度带来的地标震撼，再讲施无畏印、与愿印和216级台阶的祈福寓意，最后把抱佛脚与太湖远景变成游客能参与、能拍照、能记住的体验。',
      facts: ['通高 88 米', '1997 年落成开光', '216 级登云道', '施无畏印与与愿印'],
      metrics: [
        { value: '88m', label: '大佛通高', detail: '佛体、莲花座和台基共同形成景区最强地标尺度' },
        { value: '216级', label: '登云道', detail: '可讲成108烦恼与108愿望的祈福动线' },
        { value: '五方', label: '文化格局', detail: '与天坛、乐山、云冈、龙门共同呼应五方五佛理念' },
      ],
      cards: [
        {
          title: '大佛手印',
          eyebrow: '看点 01',
          image: '/image/bigfo.png',
          body: '右手施无畏印，左手与愿印，一个安抚恐惧，一个给予祝福。游客站在广场抬头看手印，会更容易理解大佛为什么不仅是“高”，还有可讲的佛教寓意。',
        },
        {
          title: '登云道祈福',
          eyebrow: '体验 02',
          image: '/image/foshou.png',
          body: '216级台阶很适合边走边讲：上行不是单纯爬坡，而是把烦恼放下、把愿望带上去。体力一般的游客可以分段休息，不必急着冲到平台。',
        },
        {
          title: '太湖回望',
          eyebrow: '拍照 03',
          image: '/image/bg-mountain-clean.png',
          body: '到达平台后别只拍佛像脚下，记得回头看太湖和马山半岛。这里能把大佛的庄严、山体的靠背和湖面的开阔放在同一个画面里。',
        },
      ],
      storyline: [
        { tag: '01', title: '广场看全景', body: '先在中轴稍靠后的位置看大佛、莲花座和山水背景。' },
        { tag: '02', title: '台阶讲寓意', body: '上行途中讲手印、216级台阶和祈福动线。' },
        { tag: '03', title: '平台做收束', body: '抱佛脚后回望太湖，把景区地标体验完整收住。' },
      ],
      tips: ['先拍远景再上行，避免只留下局部照片', '老人和小朋友可分段休息，不必硬爬全程', '抱佛脚后顺路接祥符禅寺或九龙灌浴'],
    },
    routeGuide: {
      main:
        '你现在在灵山大佛。体力充足的话，建议先完成抱佛脚，再下行去祥符禅寺听玄奘与小灵山的故事；如果想看动态景观，就转去九龙灌浴等下一场表演；如果想继续深度艺术线，可以接梵宫或五印坛城。',
    },
    ambientTags: ['88米大佛', '手印寓意', '216级台阶', '太湖远景'],
  },
  'jiu-long-guan-yu': {
    guideScript:
      '九龙灌浴是灵山最适合“看一场故事”的点位。表演以释迦牟尼诞生传说为核心，莲花缓缓打开，太子佛像升起，九龙同时吐水，音乐、喷泉和阳光一起把“花开见佛”的场面推到高潮。这里对亲子游客特别友好，可以把故事讲得很直观：小太子出生，九龙用清水为他沐浴，象征吉祥与清净。看表演时建议站在广场中轴稍靠后的位置，既能看到莲花开合，也能拍到九龙环绕；表演结束后再顺主路前往大佛或佛手广场，节奏最自然。',
    guideVisual: {
      overview:
        '九龙灌浴要讲成一场“动态佛诞故事”：先解释花开见佛，再提醒最佳站位和接圣水体验，最后把游客自然引向大佛、佛手广场或亲子路线。',
      facts: ['花开见佛', '九龙吐水', '每日多场表演', '祈福圣水体验'],
      metrics: [
        { value: '表演', label: '核心形态', detail: '音乐、喷泉、莲花开合共同讲述佛诞故事' },
        { value: '中轴', label: '推荐站位', detail: '稍靠后更容易拍到莲花、九龙和水幕全景' },
        { value: '亲子', label: '讲解对象', detail: '适合用故事语言解释九龙吐水和吉祥寓意' },
      ],
      cards: [
        {
          title: '花开见佛',
          eyebrow: '演绎 01',
          image: '/image/nine dragon.png',
          body: '莲花开启、太子佛像升起，是整场表演的记忆点。小景讲解时可以提前提醒游客“看莲花中心”，这样不会错过转场瞬间。',
        },
        {
          title: '九龙吐水',
          eyebrow: '典故 02',
          image: '/image/history/light-rays-fan.png',
          body: '九龙同时喷水对应佛诞传说里的沐浴场景。对孩子可以讲成“九龙送来祝福的清水”，比直接讲术语更容易听懂。',
        },
        {
          title: '接圣水',
          eyebrow: '体验 03',
          image: '/image/history/particle-rain-streak.png',
          body: '表演后接取祈福圣水，是游客最有参与感的环节。人多时建议先让老人和小朋友避开拥挤水口，再慢慢体验。',
        },
      ],
      storyline: [
        { tag: '01', title: '表演前占位', body: '提前站到广场中轴稍靠后位置，留出拍摄和观看距离。' },
        { tag: '02', title: '表演中看三段', body: '依次看莲花开启、太子升起、九龙吐水。' },
        { tag: '03', title: '表演后接线', body: '人流散开后再去大佛、佛手广场或百子戏弥勒。' },
      ],
      tips: ['提前确认当日表演场次', '站位稍靠后更容易拍全景', '表演结束后不要逆着人流穿行'],
    },
    routeGuide: {
      main:
        '你现在在九龙灌浴。看完表演后，亲子游客可以先去佛手广场和百子戏弥勒；想看核心地标就顺主线前往灵山大佛；如果还没到表演时间，可以先在广场外侧等候，别走太远。',
    },
    ambientTags: ['花开见佛', '九龙吐水', '祈福圣水', '亲子故事'],
  },
  'xiang-fu-chan-si': {
    guideScript:
      '祥符禅寺是灵山佛教文化的历史根脉。传说玄奘法师西行取经归来，见马山一带山形酷似印度灵鹫山，称这里为“小灵山”，并嘱咐弟子窥基在此住持道场。北宋大中祥符年间，寺院获赐“祥符禅寺”之名。今天来到这里，不妨把脚步放慢：先看山门和中轴空间，再听千年银杏、古井和江南第一钟的故事。大佛给游客的是震撼，祥符禅寺给游客的是时间感——它让你知道灵山不只是现代地标，也有一条从唐宋延续而来的文化线。',
    guideVisual: {
      overview:
        '祥符禅寺适合做“慢讲解”：用玄奘命名小灵山、宋代赐额、银杏古井和江南第一钟，把寺院从普通参观点讲成灵山历史的根脉。',
      facts: ['唐代小灵山渊源', '北宋祥符赐名', '千年银杏与古井', '江南第一钟'],
      metrics: [
        { value: '1300+', label: '历史纵深', detail: '从唐代小灵山传说延续到宋代赐额记忆' },
        { value: '12.8t', label: '江南第一钟', detail: '撞钟祈福能让古刹体验更有参与感' },
        { value: '慢行', label: '游览方式', detail: '适合降低音量、按山门和中轴空间慢慢看' },
      ],
      cards: [
        {
          title: '小灵山渊源',
          eyebrow: '历史 01',
          image: '/image/history/exhibit-map-xuanzang.png',
          body: '玄奘与“小灵山”的传说是寺院讲解的入口。先讲地名和法脉，再看寺院空间，游客会更容易理解这里为什么重要。',
        },
        {
          title: '古井与银杏',
          eyebrow: '遗存 02',
          image: '/image/history/exhibit-pine-comparison.jpg',
          body: '古井、银杏和残存遗迹能把“千年古刹”讲得更具体。它们不像大佛那样震撼，却让时间感落在可见的物件上。',
        },
        {
          title: '钟声祈福',
          eyebrow: '体验 03',
          image: '/image/history/art-ming-bell.png',
          body: '江南第一钟是这里最有参与感的体验之一。撞钟不只是拍照动作，也可以讲成“以钟声收束烦恼、带走祝福”。',
        },
      ],
      storyline: [
        { tag: '01', title: '先讲来历', body: '用玄奘、小灵山和窥基住持道场建立历史背景。' },
        { tag: '02', title: '再看遗存', body: '把银杏、古井、寺院中轴串成可见的时间线。' },
        { tag: '03', title: '最后听钟', body: '有条件时体验撞钟祈福，让寺院记忆落到声音上。' },
      ],
      tips: ['寺院空间请放慢脚步、降低音量', '撞钟体验以现场开放为准', '适合接大佛或历史文化路线'],
    },
    routeGuide: {
      main:
        '你现在在祥符禅寺。若想把历史线走完整，下一站可以去灵山大佛，理解从古刹法脉到现代地标的延续；如果想看艺术建筑，就转往梵宫；接近闭园时则建议沿主游线向出口方向收尾。',
    },
    ambientTags: ['玄奘渊源', '宋代赐额', '古井银杏', '钟声祈福'],
  },
  'fan-gong': {
    guideScript:
      '灵山梵宫可以看作一座把佛教艺术、传统工艺和舞台科技集中起来的宫殿。它于2009年开放，曾作为世界佛教论坛的重要会场。进入梵宫前，先看外部体量和轴线；进入内部后，重点留意穹顶天象图、东阳木雕、敦煌壁画、扬州漆器、景泰蓝须弥灯和《华藏世界》琉璃作品。这里不要只说“很豪华”，要把豪华拆成材料、工艺和光影。若赶上《吉祥颂》，全息投影、水雾、音乐和舞台调度会把佛陀修行成佛的故事变成沉浸式演出，是梵宫最值得停留的高潮。',
    guideVisual: {
      overview:
        '梵宫要按“外观尺度、内部工艺、圣坛演出”三步讲。它的亮点不是单纯金碧辉煌，而是把东阳木雕、敦煌壁画、景泰蓝、琉璃艺术和舞台科技放在同一个空间里。',
      facts: ['2009 年开放', '世界佛教论坛会场', '东阳木雕与敦煌壁画', '《吉祥颂》演出'],
      metrics: [
        { value: '7.2万㎡', label: '建筑规模', detail: '大体量空间承载论坛、展陈与演出功能' },
        { value: '多工艺', label: '艺术密度', detail: '木雕、壁画、漆器、景泰蓝、琉璃集中呈现' },
        { value: '演出', label: '体验高潮', detail: '《吉祥颂》用投影、水雾和舞台调度讲成佛故事' },
      ],
      cards: [
        {
          title: '穹顶天象',
          eyebrow: '看点 01',
          image: '/image/fangong.png',
          body: '抬头看穹顶时，不要只看亮度，要看图案如何把天象、佛教意象和空间尺度连起来。这里是游客进入梵宫后最容易“哇”的第一眼。',
        },
        {
          title: '传统工艺群',
          eyebrow: '工艺 02',
          image: '/image/history/exhibit-dharma-hall.png',
          body: '东阳木雕、敦煌壁画、扬州漆器、景泰蓝须弥灯和琉璃作品，可以拆成一组“找细节”的讲解，让游客知道自己到底在看什么。',
        },
        {
          title: '吉祥颂圣坛',
          eyebrow: '演出 03',
          image: '/image/history/light-rays-fan.png',
          body: '《吉祥颂》是梵宫的情绪高潮。建议游客先确认场次，再安排内部参观顺序，避免逛完主厅却错过演出。',
        },
      ],
      storyline: [
        { tag: '01', title: '外部定尺度', body: '先在入口看体量、轴线和宫殿感。' },
        { tag: '02', title: '内部找工艺', body: '按穹顶、木雕、壁画、漆器和琉璃逐层看。' },
        { tag: '03', title: '演出做高潮', body: '有《吉祥颂》场次时，把圣坛作为本段核心体验。' },
      ],
      tips: ['先确认《吉祥颂》当日场次', '内部适合抬头看穹顶和灯具细节', '时间紧张时优先主厅与圣坛'],
    },
    routeGuide: {
      main:
        '你现在在灵山梵宫。看完艺术空间后，可以去五印坛城对比藏传佛教建筑，也可以回到大佛线看核心地标；如果带孩子，梵宫之后接九龙灌浴或百子戏弥勒，节奏会更轻松。',
    },
    ambientTags: ['穹顶天象', '多工艺艺术', '吉祥颂', '论坛会场'],
  },
  'wu-yin-tan-cheng': {
    guideScript:
      '五印坛城最适合用“对比”来讲。刚才在大佛、梵宫看到的是汉传佛教和现代佛教艺术空间，来到这里，就会看到藏传佛教的色彩、屋顶、经幡、转经筒和曼茶罗意象。坛城供奉五方五佛，空间讲究层层进入；唐卡和装饰纹样则把宗教故事画成可观看的图像。游客最容易参与的是转经廊，顺着现场动线转动经筒，感受“转经一圈，福慧双增”的祈福寓意。这里的讲解不要急，边看色彩、边看图像、边体验仪式感，才会好听。',
    guideVisual: {
      overview:
        '五印坛城的细节核心是“藏传文化可视化”：金顶红墙、曼茶罗空间、唐卡图像和转经筒体验，共同构成与大佛、梵宫不同的文化质感。',
      facts: ['藏传佛教建筑', '五方五佛', '曼茶罗意象', '转经筒祈福'],
      metrics: [
        { value: '五印', label: '坛城主题', detail: '以五方五佛和曼茶罗意象组织空间理解' },
        { value: '转经', label: '参与体验', detail: '顺时针转动经筒，体验福慧双增的祈福仪式' },
        { value: '唐卡', label: '图像艺术', detail: '通过色彩、人物和纹样读懂藏传佛教审美' },
      ],
      cards: [
        {
          title: '金顶红墙',
          eyebrow: '建筑 01',
          image: '/image/wuyin.png',
          body: '先看外观的色彩和屋顶形式，它和梵宫、大佛广场完全不同。用“风格差异”开场，游客会立刻知道这里为什么值得停。',
        },
        {
          title: '曼茶罗空间',
          eyebrow: '文化 02',
          image: '/image/history/art-ming-ceremony.png',
          body: '坛城不是普通建筑平面，它有象征宇宙秩序的空间含义。讲解时可以用“从外到内、层层靠近中心”来帮助游客理解。',
        },
        {
          title: '转经长廊',
          eyebrow: '体验 03',
          image: '/image/wuyin.png',
          body: '转经筒是这里最适合亲手参与的体验。请按现场方向慢慢转，动作轻一点，既有仪式感，也不会影响其他游客。',
        },
      ],
      storyline: [
        { tag: '01', title: '先看差异', body: '从金顶、红墙、经幡和装饰进入藏传语境。' },
        { tag: '02', title: '再读图像', body: '看唐卡和曼茶罗，理解色彩与图像背后的象征。' },
        { tag: '03', title: '最后转经', body: '跟随动线体验转经筒，把文化讲解变成动作记忆。' },
      ],
      tips: ['转经请跟随现场方向，不要逆行', '适合与梵宫形成建筑风格对比', '拍照时避开正在祈福的游客'],
    },
    routeGuide: {
      main:
        '你现在在五印坛城。若想继续文化深度线，可以去三圣殿做佛教历史梳理；若想看建筑艺术对比，可以回到梵宫；带孩子的话，体验完转经筒后可接九龙灌浴或百子戏弥勒。',
    },
    ambientTags: ['金顶红墙', '曼茶罗', '唐卡', '转经筒'],
  },
  'fo-shou-guang-chang': {
    guideScript:
      '佛手广场是灵山最容易让游客“动手参与”的祈福点。这里的“天下第一掌”是灵山大佛右手的复制品，高11.7米、宽5.5米。游客常说“摸佛手，沾福气”，它和大佛平台的“抱佛脚”刚好组成一上一下两段祈福体验。讲解时可以先让游客看佛手尺度，再讲右手手印所表达的护佑与安定，最后提醒排队触摸、拍照和带孩子观察掌纹。这里停留时间不必很长，但记忆点非常强。',
    guideVisual: {
      overview:
        '佛手广场要讲“可触摸的祝福”：把大佛宏大的手印缩放到游客身边，让摸佛手、抱佛脚和亲子观察形成一条有动作的祈福线。',
      facts: ['高 11.7 米', '宽 5.5 米', '天下第一掌', '摸佛手与抱佛脚'],
      metrics: [
        { value: '11.7m', label: '佛手高度', detail: '巨掌尺度让游客近距离感受大佛比例' },
        { value: '5.5m', label: '佛手宽度', detail: '掌纹和手势适合亲子观察与拍照' },
        { value: '双体验', label: '祈福动线', detail: '摸佛手之后可接大佛平台抱佛脚' },
      ],
      cards: [
        {
          title: '天下第一掌',
          eyebrow: '地标 01',
          image: '/image/foshou.png',
          body: '佛手不是单纯复制品，它把大佛的宏大尺度放到游客身边。先站远看整体，再走近看掌纹，尺度感会更明显。',
        },
        {
          title: '手印寓意',
          eyebrow: '文化 02',
          image: '/image/bigfo.png',
          body: '右手手印可以讲成“安抚恐惧、给予护佑”。游客摸佛手时，就不只是合影，而是在完成一个有寓意的祈福动作。',
        },
        {
          title: '亲子观察',
          eyebrow: '互动 03',
          image: '/image/baizi.png',
          body: '带小朋友时可以让他们找掌纹、比手掌大小，再接百子戏弥勒或九龙灌浴。这样孩子不是被动听讲，而是用观察和动作记住祈福体验。',
        },
      ],
      storyline: [
        { tag: '01', title: '远看比例', body: '先看巨掌和人群的比例，建立尺度记忆。' },
        { tag: '02', title: '近看手印', body: '讲掌纹、手势和祈福寓意。' },
        { tag: '03', title: '接抱佛脚', body: '继续去大佛平台，把摸佛手与抱佛脚连起来。' },
      ],
      tips: ['排队触摸时别长时间停留', '亲子游客注意台阶和人流', '祈福线可接灵山大佛或祥符禅寺'],
    },
    ambientTags: ['天下第一掌', '摸佛手', '抱佛脚', '亲子观察'],
  },
  'bai-zi-xi-mi-le': {
    guideScript:
      '百子戏弥勒是全景区最适合用轻松语气讲的点位之一。弥勒佛笑容可掬，周围孩子姿态各不相同，有的攀爬、有的嬉戏、有的互动，整个雕塑传达的是“皆大欢喜”的生活态度。带孩子来这里，不要急着讲佛教名词，可以先玩一个观察小游戏：找一找哪个孩子最调皮，哪个动作最像自己。等孩子有兴趣后，再讲弥勒代表包容、快乐和豁达。这里适合亲子合影，也适合在大佛和梵宫之间换一口轻松的节奏。',
    guideVisual: {
      overview:
        '百子戏弥勒的细节不在宏大，而在表情和动作。用“找孩子、看笑容、讲皆大欢喜”的方式，能让亲子游客自然理解它的文化寓意。',
      facts: ['大型青铜雕塑', '百子童趣', '弥勒笑容', '皆大欢喜'],
      metrics: [
        { value: '百子', label: '观察重点', detail: '每个孩童动作不同，适合亲子找细节' },
        { value: '弥勒', label: '寓意核心', detail: '笑口常开，讲包容、快乐与豁达' },
        { value: '轻松', label: '路线角色', detail: '适合在核心地标之间调整节奏' },
      ],
      cards: [
        {
          title: '找表情',
          eyebrow: '互动 01',
          image: '/image/baizi.png',
          body: '让小朋友先找自己最喜欢的孩童表情，比直接讲解更有效。观察动作本身，就是这处雕塑最自然的打开方式。',
        },
        {
          title: '皆大欢喜',
          eyebrow: '寓意 02',
          image: '/image/history/art-song-garden.png',
          body: '弥勒的笑容可以讲成“把烦恼放轻一点”。这类表达比抽象佛理更适合景区亲子讲解，也更像导游现场会说的话。',
        },
        {
          title: '亲子合影点',
          eyebrow: '拍照 03',
          image: '/image/foshou.png',
          body: '拍照时尽量选侧面角度，既能带到弥勒笑容，也不会遮挡通行。拍完可接佛手广场继续做互动体验，让亲子路线保持轻松节奏。',
        },
      ],
      storyline: [
        { tag: '01', title: '先做观察游戏', body: '让孩子找动作、表情和自己喜欢的小雕塑。' },
        { tag: '02', title: '再讲弥勒笑容', body: '把皆大欢喜解释成快乐、包容和分享。' },
        { tag: '03', title: '最后接亲子线', body: '转去佛手广场、九龙灌浴或梵宫直观艺术空间。' },
      ],
      tips: ['适合亲子短暂停留，不必长时间占位', '拍照时注意避开主通道', '可与佛手广场组成互动段落'],
    },
    ambientTags: ['百子童趣', '皆大欢喜', '亲子游戏', '轻松拍照'],
  },
  'man-fei-long-ta': {
    guideScript:
      '曼飞龙塔是一处适合从“风格差异”切入的建筑小景。它采用傣族佛教建筑风格，和灵山大佛的庄严、梵宫的华丽、五印坛城的藏式色彩都不一样。这里的重点不是越高越震撼，而是看塔身轮廓、檐部线条、装饰细节和周围植物如何融合。走到这里，游客已经经历了不少强视觉景点，曼飞龙塔可以让节奏慢下来：看塔、看树影、看山水背景，感受不同民族佛教文化与自然环境的关系。',
    guideVisual: {
      overview:
        '曼飞龙塔要讲成自然风光线里的“风格切换点”：傣族佛教建筑、园林植物和山水背景共同形成比大佛更轻、更静的一段体验。',
      facts: ['傣族佛教风格', '佛塔轮廓', '园林融合', '自然风光路线'],
      metrics: [
        { value: '傣风', label: '建筑风格', detail: '塔身和装饰区别于汉传与藏式建筑' },
        { value: '林景', label: '环境关系', detail: '佛塔与树影、山体共同构图' },
        { value: '慢拍', label: '游览方式', detail: '适合短暂停留、拍照和休息切换' },
      ],
      cards: [
        {
          title: '塔身轮廓',
          eyebrow: '建筑 01',
          image: '/image/manfeilong.png',
          body: '先看塔尖、塔身和檐部线条，不要只把它当作路边背景。它的风格差异是这处点位最值得讲的第一层，也能和五印坛城形成对比。',
        },
        {
          title: '园林取景',
          eyebrow: '拍照 02',
          image: '/image/history/art-song-garden.png',
          body: '拍照可以让树枝、塔身和远处山体形成前中后三层，画面会比正面打卡更有层次，也更能表现佛塔和自然环境的融合。',
        },
        {
          title: '自然缓冲',
          eyebrow: '路线 03',
          image: '/image/puti.png',
          body: '从大佛或梵宫出来后，这里适合放慢步速，接菩提大道和灵山精舍，形成更松弛的自然段，让游客从强视觉景点里缓下来。',
        },
      ],
      storyline: [
        { tag: '01', title: '先辨风格', body: '比较傣族佛塔与大佛、梵宫、坛城的视觉差异。' },
        { tag: '02', title: '再看环境', body: '观察塔和植物、山水背景之间的关系。' },
        { tag: '03', title: '最后慢行', body: '接菩提大道或灵山精舍，把路线从强景观转入自然慢游。' },
      ],
      tips: ['适合自然风光线短暂停留', '侧面取景更容易带到树影层次', '体力不足时可转向精舍休息'],
    },
    ambientTags: ['傣族佛塔', '园林取景', '自然缓冲', '风格对比'],
  },
  'ling-shan-jing-she': {
    guideScript:
      '灵山精舍不是传统意义上“看完就走”的景点，它更像把佛教文化从建筑、雕塑和演出，延伸到饮食、作息和生活方式。这里有禅意住宿、素斋、早课和园林空间，适合深度游客慢下来。讲解时可以先说“这里不是赶路点，而是调整节奏的地方”：走累了可以休息补水，愿意体验的人可以了解素斋的清淡雅致和“禅食一味”的含义。如果前面已经看过大佛、梵宫和九龙灌浴，精舍能让游客从热闹转向安静，给整段游览一个柔和的停顿。',
    guideVisual: {
      overview:
        '灵山精舍的 P1 重点是生活方式：素斋、早课、禅意园林和休息补给，让游客明白这里不是普通服务点，而是深度体验灵山文化的安静入口。',
      facts: ['禅意住宿', '素斋体验', '早课体验', '园林慢行'],
      metrics: [
        { value: '素斋', label: '饮食记忆', detail: '清淡雅致，适合讲“禅食一味”的生活方式' },
        { value: '早课', label: '深度体验', detail: '适合住宿和慢游游客了解日常修行节奏' },
        { value: '休息', label: '路线功能', detail: '承接长线游览后的补水、停顿和路线调整' },
      ],
      cards: [
        {
          title: '禅食一味',
          eyebrow: '体验 01',
          image: '/image/jingshe.png',
          body: '素斋不是单纯“吃素”，它更适合讲清淡、节制和用餐节奏。对游客来说，这是把佛教文化吃进生活里的体验。',
        },
        {
          title: '早课节奏',
          eyebrow: '深度 02',
          image: '/image/history/exhibit-tea-art.jpg',
          body: '愿意住宿或慢游的游客，可以通过早课理解这里的生活节奏。它让灵山体验从“看景点”变成“过一段禅意时间”。',
        },
        {
          title: '园林停顿',
          eyebrow: '休息 03',
          image: '/image/history/art-song-garden.png',
          body: '精舍周边适合补水、整理照片和重新规划路线。它是自然线里的舒缓节点，不需要用大信息量轰炸游客。',
        },
      ],
      storyline: [
        { tag: '01', title: '先判断体力', body: '如果已经走累，先把精舍作为休息补给点。' },
        { tag: '02', title: '再讲生活方式', body: '从素斋、早课和园林解释禅意生活。' },
        { tag: '03', title: '最后做路线选择', body: '体力够接自然线，时间紧则向出口或服务区收尾。' },
      ],
      tips: ['素斋和早课以现场开放为准', '适合长线游客中途恢复体力', '可接曼飞龙塔或菩提大道自然线'],
    },
    routeGuide: {
      foodNearby:
        '灵山精舍本身就是适合咨询素斋、茶饮和休息服务的点位。若现场客流较大，建议再向梵宫服务区或游客服务中心确认餐饮补给。',
    },
    ambientTags: ['禅食一味', '早课体验', '园林停顿', '休息补给'],
  },
  'ling-shan-da-zhao-bi': {
    guideScript:
      '灵山大照壁是游客进入景区后的第一段“开场白”。它全长39.8米，最高处约7米，最厚处约1.9米，采用深浮雕花岗石拼块贴面，中间以“灵山胜境”为主题展开大型浮雕。这里不适合讲太久，但一定要讲准：它像一幅把景区主题提前展开的序章，让游客还没走到大佛，就先看到佛教文化、山水环境和灵山气象。建议先站远看横向气势，再靠近看浮雕层次，最后从这里顺主游线进入九龙灌浴、佛手广场和灵山大佛。',
    guideVisual: {
      overview:
        '大照壁的价值在“开场”：用39.8米横向尺度、深浮雕工艺和灵山胜境主题，为后续主游线建立第一眼的文化气氛。',
      facts: ['全长 39.8 米', '最高约 7 米', '最厚约 1.9 米', '深浮雕花岗石拼块'],
      metrics: [
        { value: '39.8m', label: '横向展开', detail: '入园第一眼形成足够宽阔的视觉序章' },
        { value: '7m', label: '最高处', detail: '高度与厚度共同制造入口庄重感' },
        { value: '浮雕', label: '工艺看点', detail: '深浮雕石材拼块让人物和山水更有层次' },
      ],
      cards: [
        {
          title: '华夏第一壁',
          eyebrow: '入口 01',
          image: '/image/zhaobi.png',
          body: '大照壁适合站远看整体，不要一进园就匆匆路过。它承担的是“把游客带入灵山语境”的开场作用，第一眼就交代景区的文化主题。',
        },
        {
          title: '深浮雕层次',
          eyebrow: '工艺 02',
          image: '/image/history/exhibit-moya-detail.png',
          body: '靠近后看人物、山水和石材拼块的层次，能把“很大一面墙”讲成具体可观察的浮雕工艺，也让入口讲解更有细节抓手。',
        },
        {
          title: '主游线起点',
          eyebrow: '路线 03',
          image: '/image/nine dragon.png',
          body: '讲完照壁后，最自然的动作是顺主路进入九龙灌浴，再接佛手广场和灵山大佛，路线不会来回折返，也能从入口序章走到核心地标。',
        },
      ],
      storyline: [
        { tag: '01', title: '远看横幅', body: '先看照壁宽度和入口开场气势。' },
        { tag: '02', title: '近看浮雕', body: '观察深浮雕里的山水、人物和石材拼接。' },
        { tag: '03', title: '进入主线', body: '顺路前往九龙灌浴、佛手广场和大佛。' },
      ],
      tips: ['适合入园后快速讲解，不建议长时间逗留', '拍照注意避开入口人流', '第一站推荐接九龙灌浴'],
    },
    ambientTags: ['华夏第一壁', '深浮雕', '入口序章', '主游线起点'],
  },
  'pu-ti-da-dao': {
    guideScript:
      '菩提大道不是一个“赶路通道”，它更适合边走边听。两侧树影形成林荫，菩提意象象征觉悟、清净和佛教文化的繁盛。抬头看远处，还能把太湖、青龙山、白虎山和景区轴线联系起来，感受“前有照、后有靠、左右有抱”的山水格局。这里讲解不要太满，可以留一点呼吸感：看树影落在路面上，看湖面和山体的层次，再告诉游客下一站可以去灵山大佛、曼飞龙塔或灵山精舍。它的价值就是让游客从强烈景观里慢下来。',
    guideVisual: {
      overview:
        '菩提大道的细节在行走中出现：菩提树影、太湖远景、青龙山与白虎山的山水格局，让游客把自然风光和佛教寓意一起看见。',
      facts: ['菩提树影', '太湖远景', '青龙山与白虎山', '山水格局'],
      metrics: [
        { value: '菩提', label: '植物寓意', detail: '象征觉悟、清净与佛教文化繁盛' },
        { value: '山水', label: '空间格局', detail: '太湖、青龙山、白虎山形成自然层次' },
        { value: '慢走', label: '推荐节奏', detail: '适合边走边听，不要把它当纯通道' },
      ],
      cards: [
        {
          title: '菩提树影',
          eyebrow: '自然 01',
          image: '/image/puti.png',
          body: '树影会随着时间变化，早晚和晴阴都有不同质感。讲解时可以把菩提意象讲成“在路上慢慢清净下来”。',
        },
        {
          title: '太湖远景',
          eyebrow: '山水 02',
          image: '/image/bg-mountain-clean.png',
          body: '抬头看湖面、远山和天空层次，比一直低头走路更能体会灵山选址的山水感，也能理解为什么这里适合做自然慢行段。',
        },
        {
          title: '自然换挡',
          eyebrow: '路线 03',
          image: '/image/manfeilong.png',
          body: '这里适合把路线从大佛、梵宫的强视觉，切换到曼飞龙塔、精舍这样的自然慢游段，让游客的节奏从震撼转向舒缓。',
        },
      ],
      storyline: [
        { tag: '01', title: '先放慢脚步', body: '把这里当作林荫步道，而不是赶路通道。' },
        { tag: '02', title: '再看山水', body: '观察太湖、青龙山、白虎山和景区轴线。' },
        { tag: '03', title: '最后选方向', body: '按体力选择大佛、曼飞龙塔或灵山精舍。' },
      ],
      tips: ['夏季注意遮阳和补水', '适合边走边听短讲解', '自然线可接曼飞龙塔和灵山精舍'],
    },
    ambientTags: ['菩提树影', '太湖远景', '山水格局', '自然换挡'],
  },
  'san-sheng-dian': {
    guideScript:
      '三圣殿适合放在文化深度路线的后段来讲。前面游客可能已经看过大佛、祥符禅寺、梵宫和五印坛城，这里就像一个“文化整理室”，帮助大家把分散的景点重新串回佛教历史与灵山发展脉络中。它不靠强烈视觉冲击取胜，而靠展陈、文字和空间秩序来补充理解。讲解时可以提醒游客：如果你喜欢历史文化，这里值得慢慢读；如果时间紧，就抓住三件事——灵山佛教文化从哪里来、如何传承、今天如何变成集信仰、艺术、文化和旅游于一体的综合景区。',
    guideVisual: {
      overview:
        '三圣殿要从“静态展陈”升级成“文化收束点”：把大佛、寺院、梵宫、坛城的体验重新整理成灵山佛教文化的发展线。',
      facts: ['佛教历史展示', '文化传承线索', '后段总结点', '深度文化路线'],
      metrics: [
        { value: '展陈', label: '主要方式', detail: '通过文字、图像和空间顺序梳理文化脉络' },
        { value: '串联', label: '讲解作用', detail: '把大佛、禅寺、梵宫、坛城重新连成一条线' },
        { value: '深度', label: '适合人群', detail: '更适合历史文化爱好者和慢游游客' },
      ],
      cards: [
        {
          title: '文化整理室',
          eyebrow: '定位 01',
          image: '/image/sansheng.png',
          body: '这里不是抢眼地标，而是帮游客整理信息的空间。逛到后段再来看，会更容易把前面的景点连起来，形成完整文化记忆。',
        },
        {
          title: '四点串联',
          eyebrow: '脉络 02',
          image: '/image/history/exhibit-map-zen-spread.jpg',
          body: '大佛代表地标瞻礼，祥符禅寺代表历史根脉，梵宫代表当代艺术，五印坛城代表藏传文化，三圣殿负责把它们串起来。',
        },
        {
          title: '慢读展陈',
          eyebrow: '体验 03',
          image: '/image/history/exhibit-deed-scroll.png',
          body: '如果游客愿意深度游，可以在这里慢读展陈；如果时间有限，小景只抓文化来源、传承和当代融合三件事讲清楚。',
        },
      ],
      storyline: [
        { tag: '01', title: '先回顾已游览', body: '把大佛、禅寺、梵宫、坛城放回同一条文化线。' },
        { tag: '02', title: '再读展陈', body: '抓住来源、传承和当代融合三层信息。' },
        { tag: '03', title: '最后做收束', body: '按时间决定继续深度线，还是向出口方向收尾。' },
      ],
      tips: ['适合文化深度游客慢读', '赶时间时只听三分钟脉络版', '参观时保持安静，不影响他人阅读'],
    },
    routeGuide: {
      main:
        '你现在在三圣殿。喜欢文化深度的话，可以继续去梵宫或五印坛城做艺术与建筑对照；如果已经看完主线，这里也很适合作为总结点，随后向出口或服务区收尾。',
    },
    ambientTags: ['文化整理', '佛教历史', '展陈慢读', '路线收束'],
  },
};

function applySpotDetailPolish(spot: KioskSpotConfig): KioskSpotConfig {
  const polish = P1_SPOT_DETAIL_POLISH[spot.storySpotId] || P1_SPOT_DETAIL_POLISH[spot.id];
  if (!polish) {
    return spot;
  }

  return {
    ...spot,
    guideScript: polish.guideScript ?? spot.guideScript,
    guideVisual: polish.guideVisual ? { ...spot.guideVisual, ...polish.guideVisual } : spot.guideVisual,
    routeGuide: polish.routeGuide ? { ...spot.routeGuide, ...polish.routeGuide } : spot.routeGuide,
    serviceGuide: polish.serviceGuide ? { ...spot.serviceGuide, ...polish.serviceGuide } : spot.serviceGuide,
    ambientTags: polish.ambientTags ?? spot.ambientTags,
  };
}

const SCENIC_CLOSE_MINUTES = 17 * 60;

function formatClock(date: Date): string {
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${hour}:${minute}`;
}

function getMinutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function buildFoodTimeTip(now: Date, spot: KioskSpotConfig): string {
  const minutes = getMinutesOfDay(now);
  if (minutes >= 10 * 60 + 45 && minutes <= 13 * 60 + 30) {
    return `现在接近午餐时段。${spot.routeGuide.foodNearby}`;
  }
  if (minutes > 13 * 60 + 30 && minutes < 16 * 60 + 15) {
    return `下午继续游览建议先补水，必要时找服务区短暂休息。${spot.routeGuide.foodNearby}`;
  }
  if (minutes >= 16 * 60 + 15) {
    return '现在已经偏晚，景区内部分餐饮可能陆续收尾。如果还没吃饭，建议优先向出口、游客服务中心或现场工作人员确认营业状态，离园后再安排正餐会更稳。';
  }
  return `如果还没吃早饭或体力不足，可以先补水再出发。${spot.routeGuide.foodNearby}`;
}

function buildClosingTimeTip(now: Date, spot: KioskSpotConfig): string {
  const minutesToClose = SCENIC_CLOSE_MINUTES - getMinutesOfDay(now);
  if (minutesToClose <= 0) {
    return `按常规17:00闭园参考，现在已经到或超过闭园时段。${spot.routeGuide.closing}请优先离园，具体以景区当天广播和现场工作人员提示为准。`;
  }
  if (minutesToClose <= 45) {
    return `距离常规17:00闭园约${minutesToClose}分钟。${spot.routeGuide.closing}请把安全离园放在第一位。`;
  }
  if (minutesToClose <= 90) {
    return `距离常规17:00闭园约${minutesToClose}分钟。建议只选一到两个近距离点位，不要再安排长线深度游。`;
  }
  return '时间还比较从容，但游览中也请留意景区广播、演出场次和当天现场开放提示。';
}

const defaultActions = (spotName: string): KioskAction[] => [
  {
    id: 'spot-guide',
    title: '听景点讲解',
    label: '讲讲这里',
    question: `请用游客容易听懂的方式，介绍一下${spotName}的历史、看点和游览亮点。`,
    topic: 'spot',
    icon: '◎',
    accent: '#D8A84E',
  },
  {
    id: 'route-next',
    title: '下一站去哪',
    label: '推荐路线',
    question: `我现在在${spotName}，请推荐接下来适合游览的路线，并说明每一站看什么。`,
    topic: 'route',
    icon: '↗',
    accent: '#6AA889',
  },
  {
    id: 'ticket-time',
    title: '票务与开放',
    label: '开放信息',
    question: `请告诉我${spotName}相关的开放时间、票务信息和游览注意事项。`,
    topic: 'ticket',
    icon: '票',
    accent: '#4C7FA8',
  },
  {
    id: 'food-service',
    title: '附近服务',
    label: '餐饮厕所',
    question: `我在${spotName}附近，哪里可以吃饭、休息或找到洗手间？`,
    topic: 'food',
    icon: '☕',
    accent: '#C66B4E',
  },
  {
    id: 'show-time',
    title: '演出活动',
    label: '活动安排',
    question: `今天在${spotName}附近有哪些值得看的演出、仪式或活动？`,
    topic: 'culture',
    icon: '✦',
    accent: '#8B6BD6',
  },
];

const KIOSK_SPOT_BASE: KioskSpotConfig[] = [
  {
    id: 'lingshan-dafo',
    name: '灵山大佛',
    shortName: '大佛广场',
    subtitle: '88 米露天青铜释迦牟尼立像',
    locationHint: '当前点位 · 灵山大佛观景区',
    backgroundImage: '/image/bigfo.png',
    storySpotId: 'ling-shan-da-fo',
    storyCoverImage: '/image/story/ling-shan-da-fo/thumb.jpg',
    storyTitle: '听一卷大佛前世今生',
    storyHint: '从建造缘起、铜像工艺到今日祈福动线',
    accent: '#D8A84E',
    accentSoft: 'rgba(216,168,78,0.18)',
    greeting:
      '欢迎来到灵山大佛。我是小景，这块大屏可以为你讲解大佛看点、推荐下一站路线，也能回答票务、餐饮和演出安排。请点击“按住说话”开始提问。',
    guideScript: lingshanDafoGuide,
    guideVisual: lingshanDafoVisual,
    routeGuide: lingshanDafoRoute,
    serviceGuide: lingshanDafoService,
    idleTitle: '走近灵山大佛',
    idleSubtitle: '问我大佛高度、建造故事、最佳拍照点，或让小景为你规划下一站。',
    ambientTags: ['大佛讲解', '祈福动线', '拍照点', '下一站推荐'],
    actions: defaultActions('灵山大佛'),
  },
  {
    id: 'nine-dragon',
    name: '九龙灌浴',
    shortName: '九龙灌浴',
    subtitle: '动态音乐喷泉与佛教典故演绎',
    locationHint: '当前点位 · 九龙灌浴广场',
    backgroundImage: '/image/nine dragon.png',
    storySpotId: 'jiu-long-guan-yu',
    storyCoverImage: '/image/story/jiu-long-guan-yu/thumb.jpg',
    storyTitle: '看九龙灌浴的典故',
    storyHint: '用分幕剧场讲清佛诞传说、喷泉演绎与最佳观看点',
    accent: '#5DA7B4',
    accentSoft: 'rgba(93,167,180,0.18)',
    greeting:
      '欢迎来到九龙灌浴。我是小景，可以为你介绍演出典故、观看时间、最佳站位和附近游览路线。需要帮助时，按住语音按钮告诉我就好。',
    guideScript: nineDragonGuide,
    guideVisual: nineDragonVisual,
    routeGuide: nineDragonRoute,
    serviceGuide: nineDragonService,
    idleTitle: '九龙灌浴即将开讲',
    idleSubtitle: '想知道表演时间、典故寓意和最佳观看位置，可以直接问我。',
    ambientTags: ['表演时间', '典故寓意', '最佳站位', '周边服务'],
    actions: defaultActions('九龙灌浴'),
  },
  {
    id: 'xiangfu-temple',
    name: '祥符禅寺',
    shortName: '祥符禅寺',
    subtitle: '千年梵刹与禅意游览空间',
    locationHint: '当前点位 · 祥符禅寺入口',
    backgroundImage: '/image/xiangfu.png',
    storySpotId: 'xiang-fu-chan-si',
    storyCoverImage: '/image/story/xiang-fu-chan-si/thumb.jpg',
    storyTitle: '翻开祥符禅寺旧卷',
    storyHint: '从唐代法脉、宋代赐额到今日礼佛参观',
    accent: '#8B6B4A',
    accentSoft: 'rgba(139,107,74,0.18)',
    greeting:
      '欢迎来到祥符禅寺。我是小景，可以为你讲解寺院历史、礼佛动线、参观礼仪和周边路线。语音输出已开启，按住说话即可提问。',
    guideScript: xiangfuTempleGuide,
    guideVisual: xiangfuTempleVisual,
    routeGuide: xiangfuTempleRoute,
    serviceGuide: xiangfuTempleService,
    idleTitle: '在祥符禅寺慢下来',
    idleSubtitle: '问我寺院历史、参观礼仪、殿堂看点，或让小景安排一条安静路线。',
    ambientTags: ['寺院历史', '参观礼仪', '禅意路线', '文化讲解'],
    actions: defaultActions('祥符禅寺'),
  },
  ...expandedSpotSeeds.map(createExpandedSpot),
  {
    id: 'default',
    name: '灵山胜境',
    shortName: '游客服务台',
    subtitle: 'AI 数字人景区互动导览',
    locationHint: '当前点位 · 景区互动大屏',
    backgroundImage: '/image/AigcAssets(3).png',
    storySpotId: 'ling-shan-da-fo',
    storyCoverImage: '/image/story/ling-shan-da-fo/thumb.jpg',
    storyTitle: '听一卷灵山故事',
    storyHint: '小景用视觉小说讲述景点历史与文化',
    accent: '#6A9C89',
    accentSoft: 'rgba(106,156,137,0.18)',
    greeting:
      '你好，我是灵山胜境数字导游小景。你可以问我景点讲解、路线推荐、票务开放、餐饮厕所和演出活动。语音播报已开启，请按住说话开始互动。',
    guideScript: defaultGuide,
    guideVisual: defaultVisual,
    routeGuide: defaultRoute,
    serviceGuide: defaultService,
    idleTitle: '你好，我是小景',
    idleSubtitle: '点击服务卡片，或按住语音按钮，说出你想了解的问题。',
    ambientTags: ['景点问答', '路线推荐', '服务查询', '活动演出'],
    actions: defaultActions('灵山胜境'),
  },
];

export const KIOSK_SPOTS: KioskSpotConfig[] = KIOSK_SPOT_BASE.map(applySpotDetailPolish);

export function getKioskSpotConfig(spotId?: string | null): KioskSpotConfig {
  return (
    KIOSK_SPOTS.find((spot) => spot.id === spotId || spot.storySpotId === spotId) ||
    KIOSK_SPOTS[0] ||
    KIOSK_SPOTS[KIOSK_SPOTS.length - 1]
  );
}

export function buildSpotAwareQuestion(question: string, spot: KioskSpotConfig): string {
  return [
    `当前互动大屏点位：${spot.name}（${spot.locationHint}）。`,
    '请优先围绕当前点位回答，内容适合景区大屏语音播报，表达简洁、可靠、可行动。',
    `游客问题：${question}`,
  ].join('\n');
}

export function buildKioskRouteGuide(spot: KioskSpotConfig, now = new Date()): string {
  return [
    `现在是${formatClock(now)}。我按你当前所在的“${spot.shortName}”来推荐下一段路线。`,
    spot.routeGuide.main,
    buildFoodTimeTip(now, spot),
    buildClosingTimeTip(now, spot),
  ].join('\n\n');
}

export function isRestroomQuestion(question: string): boolean {
  return /厕所|洗手间|卫生间|wc|WC|toilet|restroom/.test(question);
}

export function buildKioskRestroomGuide(spot: KioskSpotConfig): string {
  return [
    `你问的是厕所位置，我按你当前所在的“${spot.shortName}”来指路。`,
    spot.serviceGuide.restroom,
    '如果现场标识和我说的不一致，请以景区当天指示牌、广播和工作人员引导为准。',
  ].join('\n\n');
}

function compactQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replace(/[，。！？、,.!?~～\s]/g, '');
}

const GREETING_QUESTIONS = new Set([
  '你好',
  '您好',
  '你好呀',
  '您好呀',
  '嗨',
  '哈喽',
  'hello',
  'hi',
  'hey',
  '在吗',
  '喂',
  '小景',
  '小景你好',
  '你好小景',
]);

export function isGreetingQuestion(question: string): boolean {
  return GREETING_QUESTIONS.has(compactQuestion(question));
}

export function buildKioskGreetingReply(spot: KioskSpotConfig): string {
  return `你好呀，我在这里。你现在位于${spot.shortName}，可以直接问我这里有什么看点、下一站怎么走、哪里有厕所和餐饮，或者点“听故事”进入景点小剧场。`;
}
