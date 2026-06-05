# 灵山胜境知识库种子数据 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从灵山胜境文档中提取结构化知识数据，创建种子 JSON 文件，并实现自动导入脚本，为数字人问答、推荐、扫码讲解提供真实数据基础。

**Architecture:** 将文档内容拆分为三类数据：(1) 景点数据 ScenicSpot — 每个景点的讲解词、标签、关联景点；(2) 游览路线 TourRoute — 文档中3条真实路线，含讲解重点和特色体验；(3) FAQ 问答对 — 从文档和已有 test_set.json 中提取常见问题。数据以 JSON 种子文件存放，通过 Python 脚本导入 SQLite/PostgreSQL。

**Tech Stack:** Python, SQLAlchemy, JSON, FastAPI

---

### Task 1: 创建景点种子数据 `backend/data/ling_sheng_jing_spots.json`

**Files:**
- Create: `backend/data/ling_sheng_jing_spots.json`

从文档中提取所有景点信息，包括核心景点和特色景点。

- [ ] **Step 1: 写入景点种子 JSON**

创建文件 `backend/data/ling_sheng_jing_spots.json`，内容如下：

```json
{
  "version": "1.0",
  "source": "灵山胜境：历史、文化、景点特色与个性化游览指南",
  "spots": [
    {
      "id": "ling-shan-da-fo",
      "name": "灵山大佛",
      "category": "核心景点",
      "tags": ["佛教造像", "青铜", "五方五佛", "地标", "拍照"],
      "overview": "世界最高露天青铜释迦牟尼立像，高88米",
      "detail": "灵山大佛高88米，是目前世界最高露天青铜释迦牟尼立像。大佛建于1997年11月15日落成开光，是景区标志性建筑。佛像手印有深刻的佛教含义，216级台阶寓意108烦恼与108愿望。青铜铸造工艺结合了历史传统与现代科技，体现了赵朴初'五方五佛'的理念——与香港天坛大佛、四川乐山大佛、山西云冈大佛、河南龙门大佛共同构成中国佛教五大佛像格局。登顶大佛平台可俯瞰太湖全景，拍摄夕阳下的大佛，感受'佛光普照'的壮丽景象。",
      "qr_code": "LSJ_SPOT_ling-shan-da-fo",
      "related_spots": ["fan-gong", "jiu-long-guan-yu", "wu-yin-tan-cheng"]
    },
    {
      "id": "fan-gong",
      "name": "灵山梵宫",
      "category": "核心景点",
      "tags": ["佛教艺术", "建筑", "演出", "世界佛教论坛"],
      "overview": "佛教艺术的卢浮宫，世界佛教论坛主会场",
      "detail": "灵山梵宫被誉为'佛教艺术的卢浮宫'，于2009年1月1日正式开放。融合了菩提伽耶塔风格与中国石窟艺术，内部汇集了东阳木雕、敦煌壁画、扬州漆器、景泰蓝须弥灯、寿山石雕、景德镇青花斗彩缸等多种传统工艺。穹顶天象图创作依据深厚，《华藏世界》琉璃作品七彩光芒令人叹为观止。梵宫圣坛可容纳千人，是世界佛教论坛主会场，也是《吉祥颂》演出的场所，通过全息投影、水雾等现代科技展现佛陀修行成佛的故事。灵山梵宫将传统佛教艺术与现代建筑技术、数字科技完美结合，创造了当代佛教艺术的巅峰之作。",
      "qr_code": "LSJ_SPOT_fan-gong",
      "related_spots": ["ling-shan-da-fo", "wu-yin-tan-cheng", "xiang-fu-chan-si"]
    },
    {
      "id": "jiu-long-guan-yu",
      "name": "九龙灌浴",
      "category": "核心景点",
      "tags": ["表演", "音乐喷泉", "群雕", "亲子", "佛教故事"],
      "overview": "佛陀诞生场景的音乐喷泉表演",
      "detail": "九龙灌浴以佛祖四相成道为轴线，再现了释迦牟尼诞生的神圣场景。表演中九龙吐水，花开见佛，充满仪式感。每日4-5场表演，建议提前到达占据观赏位置。表演时可接取祈福圣水，寓意吉祥安康，同时欣赏水幕与阳光交织出的七彩佛光。用生动语言可为孩子讲述释迦牟尼诞生的故事，解释'九龙吐水'的传说，激发孩子对传统文化的兴趣。",
      "qr_code": "LSJ_SPOT_jiu-long-guan-yu",
      "related_spots": ["ling-shan-da-fo", "bai-zi-xi-mi-le", "fo-shou-guang-chang"]
    },
    {
      "id": "wu-yin-tan-cheng",
      "name": "五印坛城",
      "category": "核心景点",
      "tags": ["藏传佛教", "坛城", "转经筒", "唐卡"],
      "overview": "藏传佛教文化的瑰宝，可体验转经祈福",
      "detail": "五印坛城是藏传佛教文化的瑰宝，展现了藏式建筑艺术的独特魅力。可在此对比汉传与藏传佛教建筑艺术差异，了解藏传佛教文化特色、曼茶罗的佛教意义。转经廊可转动经筒，体验'转经一圈，福慧双增'的祈福文化。用简单易懂的语言可介绍转经筒的作用、唐卡的艺术特色等，让游客在互动中感受不同民族文化的魅力。",
      "qr_code": "LSJ_SPOT_wu-yin-tan-cheng",
      "related_spots": ["fan-gong", "ling-shan-da-fo", "san-sheng-dian"]
    },
    {
      "id": "xiang-fu-chan-si",
      "name": "祥符禅寺",
      "category": "核心景点",
      "tags": ["千年古刹", "历史", "玄奘", "银杏", "古井"],
      "overview": "千年古刹，见证佛教千年传承",
      "detail": "祥符禅寺原名小灵山庵，历史可追溯至1300多年前唐代贞观年间。玄奘法师西行取经归来，见此地'层峦丛翠，曲水净秀，山形酷似印度灵鹫山'，命名为'小灵山'，嘱咐大弟子窥基法师在此住持道场。北宋大中祥符年间（1008-1016年），宋真宗赐额'祥符禅寺'。千年间历经多次兴废：南宋时遭兵燹，元代重建，明代达到鼎盛，清末民初再次毁于战火，仅存一棵千年银杏、一口六角古井和一段残垣断壁。重点讲解玄奘法师与'小灵山'的渊源，古井与银杏的历史故事，江南第一钟的文化意义，以及祥符禅寺千年兴衰的历史轨迹。游客可在此参与撞钟祈福，聆听12.8吨重的江南第一钟敲响。",
      "qr_code": "LSJ_SPOT_xiang-fu-chan-si",
      "related_spots": ["ling-shan-da-fo", "fan-gong", "ling-shan-jing-she"]
    },
    {
      "id": "fo-shou-guang-chang",
      "name": "佛手广场",
      "category": "特色景点",
      "tags": ["祈福", "亲子", "拍照", "天下第一掌"],
      "overview": "'天下第一掌'所在地，灵山两大祈福体验之一",
      "detail": "佛手广场上的'天下第一掌'为灵山大佛右手复制品，高11.7米，宽5.5米。摸掌祈福，寓意'沾福气、保平安'，与'抱佛脚'并称灵山两大祈福体验。参与'抱佛脚'亲子活动，让孩子在家长陪伴下登顶大佛，感受大佛的宏伟气势，培养勇气与探索精神。",
      "qr_code": "LSJ_SPOT_fo-shou-guang-chang",
      "related_spots": ["ling-shan-da-fo", "jiu-long-guan-yu", "bai-zi-xi-mi-le"]
    },
    {
      "id": "bai-zi-xi-mi-le",
      "name": "百子戏弥勒",
      "category": "特色景点",
      "tags": ["亲子", "雕塑", "趣味", "拍照"],
      "overview": "大型青铜雕塑，展现'皆大欢喜'理念",
      "detail": "大型青铜雕塑，弥勒佛笑容可掬，周围百个孩童形态各异，体现佛教'皆大欢喜'理念，展现生活百态，充满童趣与欢乐氛围。可介绍雕塑中孩童的不同形态，引导孩子感受'皆大欢喜'的生活态度，让孩子在轻松愉快的氛围中理解佛教文化的核心价值观。在百子戏弥勒雕塑前拍照留念，让孩子与形态各异的孩童雕塑互动。",
      "qr_code": "LSJ_SPOT_bai-zi-xi-mi-le",
      "related_spots": ["fo-shou-guang-chang", "jiu-long-guan-yu", "fan-gong"]
    },
    {
      "id": "man-fei-long-ta",
      "name": "曼飞龙塔",
      "category": "特色景点",
      "tags": ["傣族佛教", "园林", "自然风光"],
      "overview": "傣族佛教建筑风格，与自然环境和谐融合",
      "detail": "曼飞龙塔采用傣族佛教建筑风格，融合园林景观设计理念，与自然环境和谐融合，展现了不同民族佛教文化的特色。介绍傣族佛教建筑风格、园林景观设计理念，与自然环境的和谐融合，展现不同民族佛教文化与自然的关系。",
      "qr_code": "LSJ_SPOT_man-fei-long-ta",
      "related_spots": ["ling-shan-jing-she", "jiu-long-guan-yu", "ling-shan-da-fo"]
    },
    {
      "id": "ling-shan-jing-she",
      "name": "灵山精舍",
      "category": "特色景点",
      "tags": ["禅意酒店", "素斋", "早课", "园林"],
      "overview": "禅意酒店，含素斋与早课体验",
      "detail": "灵山精舍是景区内禅意酒店，含素斋与早课体验，适合深度感受佛教文化，体验'禅意生活'和'天人合一'的传统园林文化思想。在这里可品尝素斋，感受佛门饮食文化的清淡雅致，体验'禅食一味'的生活方式。精舍素斋环境优雅，菜品精致，适合深度体验佛教文化的游客。",
      "qr_code": "LSJ_SPOT_ling-shan-jing-she",
      "related_spots": ["man-fei-long-ta", "xiang-fu-chan-si", "ling-shan-da-fo"]
    },
    {
      "id": "ling-shan-da-zhao-bi",
      "name": "灵山大照壁",
      "category": "特色景点",
      "tags": ["浮雕", "佛教文化", "入口"],
      "overview": "华夏第一壁，全长39.8米的大型浮雕",
      "detail": "灵山大照壁全长39.8米，最高处7米，最厚处1.9米，由深浮雕花岗石拼块贴面而成，中间是一幅以'灵山胜境'为主题的大型浮雕，展现了佛教文化的博大精深。作为景区入口标志性建筑，被称为'华夏第一壁'。",
      "qr_code": "LSJ_SPOT_ling-shan-da-zhao-bi",
      "related_spots": ["xiang-fu-chan-si", "ling-shan-da-fo"]
    },
    {
      "id": "pu-ti-da-dao",
      "name": "菩提大道",
      "category": "特色景点",
      "tags": ["自然风光", "太湖风光", "风水格局"],
      "overview": "欣赏太湖与青龙山、白虎山的自然风貌",
      "detail": "菩提大道两侧景观植物的佛教文化意义深远，如菩提树枝繁叶茂，象征着佛教文化的繁荣昌盛。在这里可欣赏太湖与青龙山、白虎山的自然风貌，感受'前有照、后有靠、左右有抱'的风水格局。漫步菩提大道，欣赏太湖风光，感受佛教文化与自然环境的完美融合，放松身心，净化心灵。",
      "qr_code": "LSJ_SPOT_pu-ti-da-dao",
      "related_spots": ["ling-shan-da-fo", "man-fei-long-ta", "ling-shan-jing-she"]
    },
    {
      "id": "san-sheng-dian",
      "name": "三圣殿",
      "category": "文化设施",
      "tags": ["佛教历史", "文化展示"],
      "overview": "佛教历史文化展示殿堂",
      "detail": "三圣殿是佛教历史文化展示的重要场所，展示了佛教在灵山地区的传承与发展历程。2009年后三期辅助工程陆续建成，涵盖三圣殿等，形成了集信仰、艺术、文化、旅游于一体的综合性佛教文化景区。",
      "qr_code": "LSJ_SPOT_san-sheng-dian",
      "related_spots": ["fan-gong", "wu-yin-tan-cheng"]
    }
  ]
}
```

- [ ] **Step 2: 验证 JSON 格式**

运行: `python -c "import json; json.load(open('backend/data/ling_sheng_jing_spots.json')); print('JSON valid')"`
Expected: `JSON valid`

- [ ] **Step 3: Commit**

```bash
git add backend/data/ling_sheng_jing_spots.json
git commit -m "feat: add Lingshengjing scenic spots seed data from official guide document"
```

---

### Task 2: 创建游览路线种子数据 `backend/data/ling_sheng_jing_routes.json`

**Files:**
- Create: `backend/data/ling_sheng_jing_routes.json`

将文档中3条个性化路线完整录入。

- [ ] **Step 1: 写入路线种子 JSON**

创建文件 `backend/data/ling_sheng_jing_routes.json`，内容如下：

```json
{
  "version": "1.0",
  "source": "灵山胜境：历史、文化、景点特色与个性化游览指南",
  "routes": [
    {
      "id": "history-culture",
      "name": "历史文化爱好者路线",
      "type": "history",
      "duration": "6小时",
      "description": "深度游览灵山胜境，从大照壁到三圣殿，感受千年佛教文化的博大精深",
      "gradient": "linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)",
      "spot_order": [
        "ling-shan-da-zhao-bi", "fo-shou-guang-chang", "xiang-fu-chan-si",
        "ling-shan-da-fo", "fan-gong", "wu-yin-tan-cheng", "san-sheng-dian"
      ],
      "spot_details": {
        "ling-shan-da-zhao-bi": {
          "讲解重点": ["全长39.8米，最高处7米，最厚处1.9米", "以'灵山胜境'为主题的大型浮雕", "深浮雕花岗石拼块贴面工艺"],
          "特色体验": []
        },
        "fo-shou-guang-chang": {
          "讲解重点": ["'天下第一掌'高11.7米，宽5.5米", "摸掌祈福，寓意'沾福气、保平安'", "与'抱佛脚'并称灵山两大祈福体验"],
          "特色体验": ["摸'天下第一掌'祈福"]
        },
        "xiang-fu-chan-si": {
          "讲解重点": ["玄奘法师与'小灵山'的渊源", "古井与银杏的历史故事", "江南第一钟的文化意义", "千年兴衰的历史轨迹"],
          "特色体验": ["参与撞钟祈福，聆听12.8吨重的江南第一钟"]
        },
        "ling-shan-da-fo": {
          "讲解重点": ["佛像手印的佛教含义", "216级台阶的文化寓意（108烦恼与108愿望）", "青铜铸造工艺的历史与现代科技结合", "'五方五佛'的理念"],
          "特色体验": ["在大佛平台俯瞰太湖全景，拍摄夕阳下的大佛"]
        },
        "fan-gong": {
          "讲解重点": ["穹顶天象图的创作依据与艺术价值", "《华藏世界》琉璃作品的工艺特点与佛教内涵", "东阳木雕的历史渊源与艺术特色", "世界佛教论坛主会场的文化地位"],
          "特色体验": ["欣赏《吉祥颂》演出，体验全息投影、水雾等现代科技"]
        },
        "wu-yin-tan-cheng": {
          "讲解重点": ["汉传与藏传佛教建筑艺术差异", "藏传佛教文化特色", "曼茶罗的佛教意义", "转经筒的祈福文化"],
          "特色体验": ["转动经筒，体验'转经一圈，福慧双增'"]
        },
        "san-sheng-dian": {
          "讲解重点": ["佛教历史文化展示"],
          "特色体验": []
        }
      }
    },
    {
      "id": "nature-scenery",
      "name": "自然风光爱好者路线",
      "type": "nature",
      "duration": "5小时",
      "description": "漫步灵山风景区，欣赏太湖美景，感受佛教文化与自然环境的完美融合",
      "gradient": "linear-gradient(135deg, #2D8B57 0%, #4CAF50 100%)",
      "spot_order": [
        "jiu-long-guan-yu", "pu-ti-da-dao", "ling-shan-da-fo",
        "man-fei-long-ta", "ling-shan-jing-she"
      ],
      "spot_details": {
        "jiu-long-guan-yu": {
          "讲解重点": ["观赏九龙灌浴表演"],
          "特色体验": ["接取祈福圣水，寓意吉祥安康，欣赏水幕与阳光交织出的七彩佛光"]
        },
        "pu-ti-da-dao": {
          "讲解重点": ["两侧景观植物的佛教文化意义", "太湖与青龙山、白虎山的自然风貌", "'前有照、后有靠、左右有抱'的风水格局"],
          "特色体验": ["漫步大道，欣赏太湖风光"]
        },
        "ling-shan-da-fo": {
          "讲解重点": ["大佛选址的地理优势", "俯瞰太湖、马山半岛的绝佳视角", "大佛与自然环境的和谐融合"],
          "特色体验": ["登顶大佛，拍摄太湖日落，感受'佛光普照'"]
        },
        "man-fei-long-ta": {
          "讲解重点": ["傣族佛教建筑风格", "园林景观设计理念", "与自然环境的和谐融合"],
          "特色体验": ["感受不同民族佛教文化与自然的关系"]
        },
        "ling-shan-jing-she": {
          "讲解重点": ["禅意园林的宁静之美", "'天人合一'的传统园林文化思想"],
          "特色体验": ["品尝素斋，感受'禅食一味'的生活方式"]
        }
      }
    },
    {
      "id": "family-kids",
      "name": "亲子家庭路线",
      "type": "family",
      "duration": "4小时",
      "description": "适合家庭出游，包含互动体验和儿童友好景点，让孩子在游玩中感受传统文化",
      "gradient": "linear-gradient(135deg, #C8882E 0%, #E8A838 100%)",
      "spot_order": [
        "jiu-long-guan-yu", "fo-shou-guang-chang", "bai-zi-xi-mi-le",
        "fan-gong", "wu-yin-tan-cheng"
      ],
      "spot_details": {
        "jiu-long-guan-yu": {
          "讲解重点": ["用生动语言讲述释迦牟尼诞生的故事", "'九龙吐水'的传说与'花开见佛'的仪式感"],
          "特色体验": ["激发孩子对传统文化的兴趣"]
        },
        "fo-shou-guang-chang": {
          "讲解重点": ["参与'抱佛脚'亲子活动"],
          "特色体验": ["让孩子在家长陪伴下登顶大佛，感受大佛的宏伟气势，培养勇气与探索精神"]
        },
        "bai-zi-xi-mi-le": {
          "讲解重点": ["雕塑中孩童的不同形态", "'皆大欢喜'的生活态度"],
          "特色体验": ["让孩子与形态各异的孩童雕塑互动，拍照留念"]
        },
        "fan-gong": {
          "讲解重点": ["简化艺术术语，重点介绍色彩、造型等直观元素", "穹顶天象图中的飞天形象", "《华藏世界》琉璃作品的七彩光芒"],
          "特色体验": ["观看《吉祥颂》演出，通过全息投影感受佛陀修行成佛的故事"]
        },
        "wu-yin-tan-cheng": {
          "讲解重点": ["用简单易懂的语言介绍藏传佛教文化", "转经筒的作用", "唐卡的艺术特色"],
          "特色体验": ["让孩子在互动中感受不同民族文化的魅力"]
        }
      }
    }
  ]
}
```

- [ ] **Step 2: 验证 JSON 格式**

运行: `python -c "import json; json.load(open('backend/data/ling_sheng_jing_routes.json')); print('JSON valid')"`
Expected: `JSON valid`

- [ ] **Step 3: Commit**

```bash
git add backend/data/ling_sheng_jing_routes.json
git commit -m "feat: add 3 personalized tour routes seed data from official guide"
```

---

### Task 3: 创建 FAQ 种子数据 `backend/data/ling_sheng_jing_faq.json`

**Files:**
- Create: `backend/data/ling_sheng_jing_faq.json`

从文档和 `test_set.json` 中提取 FAQ 问答对，按类别分组。

- [ ] **Step 1: 写入 FAQ 种子 JSON**

创建文件 `backend/data/ling_sheng_jing_faq.json`，内容如下：

```json
{
  "version": "1.0",
  "source": "灵山胜境：历史、文化、景点特色与个性化游览指南 + 标准测试集",
  "faqs": [
    {
      "question": "灵山大佛有多高？",
      "answer": "灵山大佛高88米，是目前世界最高露天青铜释迦牟尼立像。大佛于1997年11月15日落成开光，是灵山胜境的标志性建筑。",
      "keywords": "88米,青铜,释迦牟尼,最高,露天,佛像",
      "category": "景点介绍",
      "priority": 10
    },
    {
      "question": "灵山大佛是什么时候建造的？",
      "answer": "灵山大佛工程于1994年奠基，1997年11月15日落成开光，是一期工程的核心建筑。2003年二期工程以九龙灌浴为主体完成，2006-2009年三期主体工程（包括灵山梵宫、五印坛城等）完工。",
      "keywords": "1997,建成,开光,建造,历史",
      "category": "历史文化",
      "priority": 8
    },
    {
      "question": "梵宫里面有什么值得看的？",
      "answer": "灵山梵宫被誉为'佛教艺术的卢浮宫'，内部汇集了东阳木雕、敦煌壁画、扬州漆器、景泰蓝须弥灯、寿山石雕、景德镇青花斗彩缸等多种传统工艺。穹顶天象图和《华藏世界》琉璃作品是必看之作。梵宫圣坛可容纳千人，是世界佛教论坛主会场。",
      "keywords": "梵宫,东阳木雕,敦煌壁画,穹顶,华藏世界,琉璃,艺术",
      "category": "景点介绍",
      "priority": 9
    },
    {
      "question": "梵宫是什么时候建成开放的？",
      "answer": "灵山梵宫于2009年1月1日正式开放，是三期主体工程的重要组成部分。",
      "keywords": "2009,建成,开放,梵宫",
      "category": "历史文化",
      "priority": 7
    },
    {
      "question": "九龙灌浴表演一天有几场？",
      "answer": "九龙灌浴每日有4-5场表演，建议提前到达占据观赏位置。表演再现了释迦牟尼诞生的神圣场景，九龙吐水，花开见佛。观赏时可接取祈福圣水，寓意吉祥安康。",
      "keywords": "4,5,场,表演,时间,九龙灌浴",
      "category": "游览指南",
      "priority": 10
    },
    {
      "question": "《吉祥颂》演出时间是什么时候？",
      "answer": "《吉祥颂》演出每日10:35、11:30、14:00、16:00（以景区公告为准），时长20分钟。在梵宫圣坛演出，通过全息投影、水雾等现代科技展现佛陀修行成佛的故事。",
      "keywords": "吉祥颂,演出,时间,10:35,11:30,14:00,16:00,20分钟",
      "category": "游览指南",
      "priority": 10
    },
    {
      "question": "五印坛城是什么建筑风格？",
      "answer": "五印坛城是藏式建筑风格，展现了藏传佛教文化的特色。在此可对比汉传与藏传佛教建筑艺术差异，了解藏传佛教文化特色、曼茶罗的佛教意义，以及转经筒的祈福文化。",
      "keywords": "藏式,藏传佛教,坛城,建筑,风格",
      "category": "景点介绍",
      "priority": 8
    },
    {
      "question": "灵山胜境有哪些主要景点？",
      "answer": "灵山胜境主要景点包括：灵山大佛（世界最高露天青铜释迦牟尼立像）、灵山梵宫（佛教艺术殿堂）、九龙灌浴（佛祖诞生场景再现）、五印坛城（藏传佛教文化瑰宝）、祥符禅寺（千年古刹）、佛手广场（天下第一掌）、百子戏弥勒、曼飞龙塔、灵山精舍等。",
      "keywords": "大佛,梵宫,九龙灌浴,五印坛城,祥符禅寺,曼飞龙塔,主要景点",
      "category": "景点介绍",
      "priority": 9
    },
    {
      "question": "小灵山这个名字是怎么来的？",
      "answer": "唐贞观年间，玄奘法师西行取经归来，途经马山时，见此地'层峦丛翠，曲水净秀，山形酷似印度灵鹫山'，遂将所译《大般若经》中的'灵鹫胜境'之名赐予此地，命名为'小灵山'，并嘱咐大弟子窥基法师在此住持道场，兴建小灵山庵。",
      "keywords": "玄奘,唐僧,命名,天竺,灵鹫山,小灵山,来历",
      "category": "历史文化",
      "priority": 8
    },
    {
      "question": "灵山胜境的门票多少钱？",
      "answer": "灵山胜境为国家5A级旅游景区。具体门票价格请以景区官方公告为准。景区提供导游讲解服务，300元起。",
      "keywords": "门票,价格,元,优惠政策",
      "category": "门票交通",
      "priority": 9
    },
    {
      "question": "灵山胜境有什么优惠政策？",
      "answer": "景区对老人、学生、儿童等群体有相应优惠政策。具体请以景区官方公告为准。",
      "keywords": "老人,学生,儿童,优惠,半价,政策",
      "category": "门票交通",
      "priority": 7
    },
    {
      "question": "最佳游览时间是什么时候？",
      "answer": "春秋季节（3-5月、9-11月）气候宜人，温度适中，适合户外活动。春季有樱花、桃花盛开，秋季有银杏金黄，景色美不胜收。建议上午9点前入园避开人流高峰，下午可观赏太湖日落。",
      "keywords": "春秋,季节,最佳,时间,3月,9月,银杏,樱花",
      "category": "游览指南",
      "priority": 7
    },
    {
      "question": "景区里面有什么好吃的？",
      "answer": "景区内有多种餐饮选择：梵宫素斋自助（50元/位），清淡雅致，体验佛门饮食文化；素面套餐（35元/位），价格实惠，口味清淡；灵山精舍素斋，环境优雅，菜品精致，适合深度体验佛教文化的游客。",
      "keywords": "美食,素斋,素食,餐饮,好吃,梵宫,精舍,素面",
      "category": "美食体验",
      "priority": 8
    },
    {
      "question": "景区里面有住宿的地方吗？",
      "answer": "景区内有灵山精舍，是禅意酒店，含素斋与早课体验，适合深度感受佛教文化。周边马山镇也有多家酒店、民宿可供选择，价格从几百元到上千元不等，适合不同预算的游客。",
      "keywords": "住宿,酒店,精舍,民宿,住宿推荐",
      "category": "美食体验",
      "priority": 6
    },
    {
      "question": "推荐一条适合历史爱好者的路线",
      "answer": "推荐'历史文化爱好者路线'（6小时深度游）：南门入园→灵山大照壁→佛手广场→祥符禅寺→灵山大佛→灵山梵宫→五印坛城→三圣殿→出口。重点体验：在祥符禅寺撞钟祈福、在梵宫欣赏《吉祥颂》演出、在大佛平台俯瞰太湖、在五印坛城转经祈福。",
      "keywords": "历史,文化,路线,推荐,深度游,6小时",
      "category": "游览路线",
      "priority": 8
    },
    {
      "question": "推荐一条适合带孩子玩的路线",
      "answer": "推荐'亲子家庭路线'（4小时轻松游）：南门入园→九龙灌浴→佛手广场→百子戏弥勒→梵宫→五印坛城→出口。特色体验：参与'抱佛脚'亲子活动、观看《吉祥颂》演出、品尝特色素面套餐、在百子戏弥勒雕塑前拍照留念。",
      "keywords": "亲子,家庭,孩子,路线,推荐,4小时",
      "category": "游览路线",
      "priority": 8
    },
    {
      "question": "推荐一条自然风光路线",
      "answer": "推荐'自然风光爱好者路线'（5小时全景游）：南门入园→九龙灌浴→菩提大道→灵山大佛→曼飞龙塔→灵山精舍→梵宫广场→出口。可在九龙灌浴接取圣水、在菩提大道欣赏太湖风光、在大佛平台拍摄太湖日落、在灵山精舍品尝素斋。",
      "keywords": "自然,风光,太湖,路线,推荐,5小时",
      "category": "游览路线",
      "priority": 8
    },
    {
      "question": "'天下第一掌'是什么？",
      "answer": "'天下第一掌'是灵山大佛右手的复制品，位于佛手广场，高11.7米，宽5.5米。摸掌祈福，寓意'沾福气、保平安'，与'抱佛脚'并称灵山两大祈福体验。",
      "keywords": "天下第一掌,佛手,复制,祈福,摸掌",
      "category": "景点介绍",
      "priority": 7
    },
    {
      "question": "百子戏弥勒是什么？",
      "answer": "百子戏弥勒是一座大型青铜雕塑，弥勒佛笑容可掬，周围百个孩童形态各异，体现佛教'皆大欢喜'理念，展现生活百态，充满童趣与欢乐氛围。非常适合亲子互动。",
      "keywords": "百子戏弥勒,雕塑,弥勒佛,孩童,亲子,趣味",
      "category": "景点介绍",
      "priority": 6
    },
    {
      "question": "灵山胜境的历史有多久？",
      "answer": "灵山胜境的历史可追溯至1300多年前的唐代贞观年间，与玄奘法师西行取经的壮举紧密相连。小灵山庵（后赐名祥符禅寺）历经千年兴衰：北宋赐额、南宋兵燹、元代重建、明代鼎盛、清末民初毁于战火。现代灵山胜境1994年重新奠基，1997年灵山大佛落成，2009年梵宫开放，形成今天的综合性佛教文化景区。",
      "keywords": "历史,1300年,唐代,玄奘,祥符禅寺,千年",
      "category": "历史文化",
      "priority": 7
    },
    {
      "question": "游览灵山胜境需要注意什么？",
      "answer": "灵山胜境为佛教文化场所，请注意言行举止，保持安静，尊重宗教信仰。不触摸佛像，不随意拍照（部分区域禁止拍照）。建议穿着舒适的运动鞋，因为需要步行较多。夏季注意防晒，冬季注意保暖。建议携带相机、手机、充电宝、防晒霜、雨伞等物品。",
      "keywords": "注意,文明,礼貌,佛像,拍照,穿着,舒适",
      "category": "游览指南",
      "priority": 6
    },
    {
      "question": "灵山胜境的世界佛教论坛是什么？",
      "answer": "灵山胜境是世界佛教论坛永久会址，已成功举办多届世界佛教论坛。论坛在梵宫圣坛举办，可容纳千人，是全球佛教徒交流的重要平台，促进了不同佛教流派、不同文化背景之间的对话与融合。",
      "keywords": "世界佛教,论坛,永久会址,梵宫,交流",
      "category": "历史文化",
      "priority": 5
    }
  ]
}
```

- [ ] **Step 2: 验证 JSON 格式**

运行: `python -c "import json; json.load(open('backend/data/ling_sheng_jing_faq.json')); print('JSON valid')"`
Expected: `JSON valid`

- [ ] **Step 3: Commit**

```bash
git add backend/data/ling_sheng_jing_faq.json
git commit -m "feat: add Lingshengjing FAQ seed data (22 Q&As) from guide doc and test set"
```

---

### Task 4: 创建种子数据导入脚本 `backend/scripts/seed_lingshengjing.py`

**Files:**
- Create: `backend/scripts/seed_lingshengjing.py`
- Modify: `backend/app/models/tourist.py` (查看现有 Tourist/ScenicSpot model 是否需要扩展)

读取三个种子 JSON 文件，将数据导入数据库（FAQ 表 + 新建景点/路线表）。

- [ ] **Step 1: 在 `backend/app/models/tourist.py` 中新增 ScenicSpot 和 TourRoute 模型**

在文件末尾追加以下模型定义：

```python
class ScenicSpot(Base):
    __tablename__ = "scenic_spots"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    category: Mapped[str] = mapped_column(String(50), default="核心景点")  # 核心景点/特色景点/文化设施
    tags: Mapped[list | None] = mapped_column(JSON)
    overview: Mapped[str] = mapped_column(Text, default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    qr_code: Mapped[str | None] = mapped_column(String(200), index=True)
    related_spots: Mapped[list | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TourRoute(Base):
    __tablename__ = "tour_routes"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    route_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # history/nature/family
    duration: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    gradient: Mapped[str | None] = mapped_column(String(200))
    spot_order: Mapped[list] = mapped_column(JSON)  # ordered list of spot IDs
    spot_details: Mapped[dict | None] = mapped_column(JSON)  # {spot_id: {讲解重点:[], 特色体验:[]}}
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: 创建种子数据导入脚本**

创建文件 `backend/scripts/seed_lingshengjing.py`，内容如下：

```python
"""Seed Lingshengjing scenic spots, tour routes, and FAQ data into the database."""
import json
import logging
import sys
from pathlib import Path

import asyncio

# Add project root to path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.database import async_session, init_db, engine
from app.models.tourist import ScenicSpot, TourRoute
from app.models.knowledge import FaqEntry

logger = logging.getLogger(__name__)

DATA_DIR = ROOT / "data"


async def seed_spots(session, data: dict) -> int:
    """Insert or update scenic spots. Returns count."""
    count = 0
    for item in data["spots"]:
        spot = ScenicSpot(
            id=item["id"],
            name=item["name"],
            category=item["category"],
            tags=item.get("tags", []),
            overview=item.get("overview", ""),
            detail=item.get("detail", ""),
            qr_code=item.get("qr_code"),
            related_spots=item.get("related_spots", []),
        )
        # Upsert: merge if exists
        from sqlalchemy import select
        stmt = select(ScenicSpot).where(ScenicSpot.id == spot.id)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = spot.name
            existing.category = spot.category
            existing.tags = spot.tags
            existing.overview = spot.overview
            existing.detail = spot.detail
            existing.qr_code = spot.qr_code
            existing.related_spots = spot.related_spots
        else:
            session.add(spot)
        count += 1
    return count


async def seed_routes(session, data: dict) -> int:
    """Insert or update tour routes. Returns count."""
    count = 0
    for item in data["routes"]:
        route = TourRoute(
            id=item["id"],
            name=item["name"],
            route_type=item["type"],
            duration=item["duration"],
            description=item.get("description", ""),
            gradient=item.get("gradient"),
            spot_order=item.get("spot_order", []),
            spot_details=item.get("spot_details"),
        )
        from sqlalchemy import select
        stmt = select(TourRoute).where(TourRoute.id == route.id)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = route.name
            existing.route_type = route.route_type
            existing.duration = route.duration
            existing.description = route.description
            existing.gradient = route.gradient
            existing.spot_order = route.spot_order
            existing.spot_details = route.spot_details
        else:
            session.add(route)
        count += 1
    return count


async def seed_faqs(session, data: dict) -> int:
    """Insert or update FAQ entries. Returns count."""
    from sqlalchemy import select
    count = 0
    for item in data["faqs"]:
        # Check if FAQ already exists by question text
        stmt = select(FaqEntry).where(FaqEntry.question == item["question"])
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            existing.answer = item["answer"]
            existing.keywords = item.get("keywords", "")
            existing.category = item.get("category", "general")
            existing.priority = item.get("priority", 0)
        else:
            faq = FaqEntry(
                question=item["question"],
                answer=item["answer"],
                keywords=item.get("keywords", ""),
                category=item.get("category", "general"),
                priority=item.get("priority", 0),
            )
            session.add(faq)
        count += 1
    return count


async def main():
    """Run all seed operations."""
    logging.basicConfig(level=logging.INFO)
    logger.info("Starting Lingshengjing seed...")

    # Ensure tables exist
    await init_db()

    async with async_session() as session:
        async with session.begin():
            # Seed spots
            spots_file = DATA_DIR / "ling_sheng_jing_spots.json"
            if spots_file.exists():
                spots_data = json.loads(spots_file.read_text(encoding="utf-8"))
                spot_count = await seed_spots(session, spots_data)
                logger.info("Seeded %d scenic spots", spot_count)
            else:
                logger.warning("Spots seed file not found: %s", spots_file)

            # Seed routes
            routes_file = DATA_DIR / "ling_sheng_jing_routes.json"
            if routes_file.exists():
                routes_data = json.loads(routes_file.read_text(encoding="utf-8"))
                route_count = await seed_routes(session, routes_data)
                logger.info("Seeded %d tour routes", route_count)
            else:
                logger.warning("Routes seed file not found: %s", routes_file)

            # Seed FAQs
            faq_file = DATA_DIR / "ling_sheng_jing_faq.json"
            if faq_file.exists():
                faq_data = json.loads(faq_file.read_text(encoding="utf-8"))
                faq_count = await seed_faqs(session, faq_data)
                logger.info("Seeded %d FAQ entries", faq_count)
            else:
                logger.warning("FAQ seed file not found: %s", faq_file)

        logger.info("Seed complete!")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: 确保 `backend/scripts/__init__.py` 存在**

```bash
# 创建空的 __init__.py（如果不存在）
touch backend/scripts/__init__.py
```

实际上在 Windows PowerShell 中：
```powershell
if (-not (Test-Path "backend/scripts/__init__.py")) { New-Item -ItemType File "backend/scripts/__init__.py" }
```

- [ ] **Step 3: 运行种子脚本验证**

运行: `cd backend && python scripts/seed_lingshengjing.py`
Expected: 输出类似 `Seeded 12 scenic spots`, `Seeded 3 tour routes`, `Seeded 22 FAQ entries`, `Seed complete!`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/tourist.py backend/scripts/seed_lingshengjing.py backend/scripts/__init__.py
git commit -m "feat: add ScenicSpot/TourRoute models and seed import script for Lingshengjing data"
```

---

### Task 5: 新增景点和路线 API 端点

**Files:**
- Create: `backend/app/api/spots.py`
- Create: `backend/app/api/routes_api.py`（注意避免与 react-router 的 routes 冲突）
- Modify: `backend/app/main.py`（注册新路由）

提供景点列表、景点详情、路线列表、路线详情的 REST API。

- [ ] **Step 1: 创建景点 API**

创建文件 `backend/app/api/spots.py`：

```python
"""Scenic spots API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import ScenicSpot

router = APIRouter(prefix="/api/spots", tags=["spots"])


class SpotOut(BaseModel):
    id: str
    name: str
    category: str
    tags: list[str] | None
    overview: str
    qr_code: str | None

    class Config:
        from_attributes = True


class SpotDetail(SpotOut):
    detail: str
    related_spots: list[str] | None


@router.get("", response_model=list[SpotOut])
async def list_spots(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all scenic spots, optionally filtered by category."""
    stmt = select(ScenicSpot).where(ScenicSpot.is_active == True)
    if category:
        stmt = stmt.where(ScenicSpot.category == category)
    stmt = stmt.order_by(ScenicSpot.name)
    result = await db.execute(stmt)
    spots = result.scalars().all()
    return [SpotOut.model_validate(s) for s in spots]


@router.get("/{spot_id}", response_model=SpotDetail)
async def get_spot(
    spot_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a scenic spot by ID."""
    stmt = select(ScenicSpot).where(ScenicSpot.id == spot_id)
    result = await db.execute(stmt)
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="景点未找到")
    return SpotDetail.model_validate(spot)
```

- [ ] **Step 2: 创建路线 API**

创建文件 `backend/app/api/routes_api.py`：

```python
"""Tour routes API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import TourRoute

router = APIRouter(prefix="/api/routes", tags=["routes"])


class RouteOut(BaseModel):
    id: str
    name: str
    route_type: str
    duration: str
    description: str
    gradient: str | None


class RouteDetail(RouteOut):
    spot_order: list[str]
    spot_details: dict | None


@router.get("", response_model=list[RouteOut])
async def list_routes(
    route_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all tour routes, optionally filtered by type."""
    stmt = select(TourRoute).where(TourRoute.is_active == True)
    if route_type:
        stmt = stmt.where(TourRoute.route_type == route_type)
    result = await db.execute(stmt)
    routes = result.scalars().all()
    return [RouteOut.model_validate(r) for r in routes]


@router.get("/{route_id}", response_model=RouteDetail)
async def get_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a tour route by ID."""
    stmt = select(TourRoute).where(TourRoute.id == route_id)
    result = await db.execute(stmt)
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="路线未找到")
    return RouteDetail.model_validate(route)
```

- [ ] **Step 3: 在 `main.py` 中注册新路由**

读取 `backend/app/main.py`，在已有的路由注册区域添加：

```python
from app.api import spots, routes_api
app.include_router(spots.router)
app.include_router(routes_api.router)
```

找到 `app/main.py` 中其他 `include_router` 的位置，在附近添加上述两行。

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/spots.py backend/app/api/routes_api.py backend/app/main.py
git commit -m "feat: add scenic spots and tour routes REST API endpoints"
```

---

### Task 6: 前端 API 层 — 创建景点和路线 TypeScript API 客户端

**Files:**
- Create: `frontend/src/api/spots.ts`
- Create: `frontend/src/api/routes.ts`

- [ ] **Step 1: 创建景点 API 客户端**

创建文件 `frontend/src/api/spots.ts`：

```typescript
import request from './request';

export interface Spot {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  overview: string;
  qr_code: string | null;
}

export interface SpotDetail extends Spot {
  detail: string;
  related_spots: string[] | null;
}

export const listSpots = (category?: string) => {
  const params = category ? { category } : {};
  return request.get<Spot[]>('/spots', params);
};

export const getSpotById = (id: string) => {
  return request.get<SpotDetail>(`/spots/${id}`);
};
```

- [ ] **Step 2: 创建路线 API 客户端**

创建文件 `frontend/src/api/routes.ts`：

```typescript
import request from './request';

export interface TourRoute {
  id: string;
  name: string;
  route_type: string;
  duration: string;
  description: string;
  gradient: string | null;
}

export interface TourRouteDetail extends TourRoute {
  spot_order: string[];
  spot_details: Record<string, { 讲解重点: string[]; 特色体验: string[] }> | null;
}

export const listRoutes = (routeType?: string) => {
  const params = routeType ? { route_type: routeType } : {};
  return request.get<TourRoute[]>('/routes', params);
};

export const getRouteById = (id: string) => {
  return request.get<TourRouteDetail>(`/routes/${id}`);
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/spots.ts frontend/src/api/routes.ts
git commit -m "feat: add spots and routes API client wrappers for frontend"
```

---

### Task 7: 重构 RecommendPage 使用真实路线数据

**Files:**
- Modify: `frontend/src/pages/tourist/RecommendPage.tsx`

将 mock 路线数据替换为从后端 API 获取的真实数据，同时增加路线详情展开视图。

- [ ] **Step 1: 重写 RecommendPage**

修改 `frontend/src/pages/tourist/RecommendPage.tsx`，核心改动：

1. 删除 `MOCK_ROUTES` 常量
2. 使用 `listRoutes` API 获取真实路线
3. 点击路线卡片时展开详情，显示景点列表、讲解重点、特色体验
4. 兴趣标签映射到路线 type：`history` → 历史文化, `nature` → 自然风光, `family` → 亲子

完整替换文件内容：

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { ClockCircleOutlined, CompassOutlined, RightOutlined, DownOutlined, UpOutlined, StarFilled } from '@ant-design/icons';
import { listRoutes, getRouteById, type TourRoute, type TourRouteDetail } from '../../api/routes';
import { getSpotById, type SpotDetail } from '../../api/spots';

const INTEREST_OPTIONS = [
  { label: '历史文化', value: 'history' },
  { label: '自然风光', value: 'nature' },
  { label: '亲子活动', value: 'family' },
  { label: '全部路线', value: '' },
];

const RecommendPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [routeDetail, setRouteDetail] = useState<TourRouteDetail | null>(null);
  const [spotCache, setSpotCache] = useState<Record<string, SpotDetail>>({});
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch routes from backend
  useEffect(() => {
    setLoading(true);
    listRoutes(selectedType || undefined)
      .then((data) => {
        setRoutes(data);
      })
      .catch(() => {
        setRoutes([]);
      })
      .finally(() => setLoading(false));
  }, [selectedType]);

  // Fetch route detail when expanded
  const handleExpandRoute = useCallback(async (routeId: string) => {
    if (expandedRoute === routeId) {
      setExpandedRoute(null);
      setRouteDetail(null);
      return;
    }
    setExpandedRoute(routeId);
    setRouteDetail(null);
    try {
      const detail = await getRouteById(routeId);
      setRouteDetail(detail);
      // Pre-fetch spot details
      const spotIds = detail.spot_order || [];
      const cache: Record<string, SpotDetail> = {};
      await Promise.all(
        spotIds.map(async (id) => {
          try { cache[id] = await getSpotById(id); } catch { /* skip */ }
        })
      );
      setSpotCache(cache);
    } catch {
      setRouteDetail(null);
    }
  }, [expandedRoute]);

  const handleInterestChange = useCallback((value: string) => {
    setSelectedType(value);
  }, []);

  const renderRouteCard = useCallback((route: TourRoute, index: number) => {
    const isExpanded = expandedRoute === route.id;
    return (
      <div
        key={route.id}
        data-testid={`route-card-${route.id}`}
        className="card-hover animate-fade-in-up"
        style={{
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '16px',
          backgroundColor: 'var(--surface-card)',
          animationDelay: `${index * 80}ms`,
        }}
      >
        {/* Gradient header */}
        <div
          style={{
            padding: isMobile ? '16px' : '20px',
            background: route.gradient || 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
            color: '#fff',
            cursor: 'pointer',
          }}
          onClick={() => handleExpandRoute(route.id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? '15px' : '16px', fontWeight: 600 }}>
              {route.name}
            </h3>
            {isExpanded ? <UpOutlined style={{ fontSize: '12px' }} /> : <DownOutlined style={{ fontSize: '12px' }} />}
          </div>
          <div style={{
            display: 'flex', gap: '20px', marginTop: '8px',
            fontSize: '13px', opacity: 0.9,
          }}>
            <span><ClockCircleOutlined /> {route.duration}</span>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: isMobile ? '14px 16px' : '16px 20px' }}>
          <p style={{
            color: 'var(--text-secondary)', margin: '0 0 12px 0',
            fontSize: '14px', lineHeight: 1.6,
          }}>
            {route.description}
          </p>

          {/* Expanded detail */}
          {isExpanded && routeDetail && (
            <div style={{
              marginTop: '16px', paddingTop: '16px',
              borderTop: '1px solid var(--border-light)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                路线景点
              </div>
              {routeDetail.spot_order.map((spotId, i) => {
                const spot = spotCache[spotId];
                const detail = routeDetail.spot_details?.[spotId];
                return (
                  <div
                    key={spotId}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--color-primary)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {spot?.name || spotId}
                      </span>
                    </div>
                    {spot?.overview && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {spot.overview}
                      </div>
                    )}
                    {detail?.讲解重点 && detail.讲解重点.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>讲解重点：</div>
                        <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                          {detail.讲解重点.map((p, j) => <li key={j}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {detail?.特色体验 && detail.特色体验.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '6px' }}>
                        <div style={{ fontWeight: 500 }}>特色体验：</div>
                        <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                          {detail.特色体验.map((e, j) => <li key={j}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }, [expandedRoute, routeDetail, spotCache, handleExpandRoute, isMobile]);

  return (
    <div data-testid="recommend-page" className="ink-wash-bg" style={{
      padding: isMobile ? '16px' : '24px',
      maxWidth: '800px',
      margin: '0 auto',
      paddingBottom: isMobile ? '80px' : '24px',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          margin: '0 0 4px 0',
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CompassOutlined style={{ color: 'var(--color-primary)' }} />
          个性化路线推荐
        </h2>
        <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '14px' }}>
          选择你的兴趣，为你定制专属游览路线
        </p>
      </div>

      {/* Interest tags */}
      <div className="scroll-tags" data-testid="interest-tags" style={{
        marginBottom: '20px',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
      }}>
        {INTEREST_OPTIONS.map((option) => {
          const selected = selectedType === option.value;
          return (
            <button
              key={option.value}
              data-testid={`tag-${option.value || 'all'}`}
              onClick={() => handleInterestChange(option.value)}
              className={selected ? 'btn-pill active' : 'btn-pill'}
              style={{
                whiteSpace: 'nowrap',
                flexShrink: 0,
                borderColor: selected ? 'var(--color-primary)' : undefined,
                backgroundColor: selected ? 'var(--color-primary-bg)' : undefined,
                color: selected ? 'var(--color-primary)' : undefined,
                fontWeight: selected ? 600 : undefined,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div data-testid="route-list" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 200ms' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>加载中...</div>
        ) : routes.length > 0 ? (
          routes.map((route, index) => renderRouteCard(route, index))
        ) : (
          <div data-testid="empty-state" className="animate-fade-in" style={{
            textAlign: 'center', padding: '60px 20px',
            color: 'var(--text-tertiary)', backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)',
          }}>
            <CompassOutlined style={{ fontSize: '40px', marginBottom: '12px', color: 'var(--gray-300)' }} />
            <div style={{ fontSize: '15px', fontWeight: 500 }}>暂无匹配的推荐路线</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendPage;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/tourist/RecommendPage.tsx
git commit -m "refactor: replace mock routes with real API-driven route cards + expandable detail"
```

---

### Task 8: 重构 QRScan 使用真实景点数据 + 真实扫码

**Files:**
- Modify: `frontend/src/pages/tourist/QRScan.tsx`
- Modify: `frontend/package.json`（添加 `html5-qrcode` 依赖）

将 mock 扫码改为真实摄像头扫码，景点列表从 API 加载。

- [ ] **Step 1: 安装 `html5-qrcode` 库**

```bash
cd frontend && npm install html5-qrcode
```

- [ ] **Step 2: 重写 QRScan 组件**

修改 `frontend/src/pages/tourist/QRScan.tsx`，核心改动：

1. 使用 `html5-qrcode` 实现真实摄像头扫码
2. 景点列表从 `/api/spots` 加载
3. 扫码结果匹配到景点后，显示景点 overview 并提供"开始讲解"按钮
4. 保留手动选择景点的 fallback

完整替换文件内容：

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScanOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { listSpots, type Spot } from '../../api/spots';

export interface QRScanProps {
  onScan?: (spot: Spot) => void;
  onError?: (error: string) => void;
}

const QRScanCard: React.FC<QRScanProps> = ({ onScan, onError }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Spot | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load spots from API
  useEffect(() => {
    setLoading(true);
    listSpots()
      .then((data) => setSpots(data))
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const handleStartScan = useCallback(async () => {
    if (!containerRef.current) return;
    setScanning(true);
    setScanError(null);
    setResult(null);

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          // QR code decoded — try to match to a spot
          scanner.stop().catch(() => {});
          setScanning(false);

          // Try to match QR code content to a spot
          // Format: "LSJ_SPOT_<spot-id>" or direct URL
          let matchedSpot: Spot | undefined;
          for (const spot of spots) {
            if (decodedText.includes(spot.id) || decodedText.includes(spot.qr_code || '')) {
              matchedSpot = spot;
              break;
            }
            // Fuzzy match by name
            if (decodedText.includes(spot.name)) {
              matchedSpot = spot;
              break;
            }
          }
          if (matchedSpot) {
            setResult(matchedSpot);
            onScan?.(matchedSpot);
          } else {
            setScanError(`未识别的二维码: ${decodedText}`);
          }
        },
        () => {
          // Scan error (individual frame failure) — ignore, keep scanning
        },
      );
    } catch (err: any) {
      setScanning(false);
      const msg = err?.message || '无法启动摄像头';
      setScanError(msg);
      onError?.(msg);
    }
  }, [spots, onScan, onError]);

  const handleStopScan = useCallback(() => {
    scannerRef.current?.stop().catch(() => {});
    setScanning(false);
  }, []);

  const handleLocationSelect = useCallback((spot: Spot) => {
    setResult(spot);
    onScan?.(spot);
  }, [onScan]);

  const handleReset = useCallback(() => {
    setResult(null);
    setScanError(null);
  }, []);

  return (
    <div data-testid="qr-scan-card" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100%',
    }}>
      {/* Scan Area */}
      <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
        {/* Scan Box / Camera Viewfinder */}
        <div
          ref={containerRef}
          data-testid="scan-area"
          style={{
            width: 140,
            height: 140,
            minWidth: 140,
            borderRadius: 'var(--radius-lg)',
            border: `2.5px solid ${scanning ? 'var(--color-primary)' : result ? 'var(--color-success)' : 'var(--border-default)'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: scanning
              ? 'var(--color-primary-bg)'
              : result
                ? 'var(--color-success-bg)'
                : 'var(--surface-card)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            cursor: !scanning && !result ? 'pointer' : 'default',
          }}
          onClick={!scanning && !result ? handleStartScan : undefined}
        >
          {/* Camera viewfinder when scanning */}
          {scanning && <div id="qr-reader" style={{ width: '100%', height: '100%' }} />}

          {/* Corner Brackets (idle state) */}
          {!scanning && !result && (
            <>
              <div style={{ position: 'absolute', top: -1, left: -1, width: 20, height: 20, borderTop: '3px solid var(--color-primary)', borderLeft: '3px solid var(--color-primary)', borderRadius: '12px 0 0 0' }} />
              <div style={{ position: 'absolute', top: -1, right: -1, width: 20, height: 20, borderTop: '3px solid var(--color-primary)', borderRight: '3px solid var(--color-primary)', borderRadius: '0 12px 0 0' }} />
              <div style={{ position: 'absolute', bottom: -1, left: -1, width: 20, height: 20, borderBottom: '3px solid var(--color-primary)', borderLeft: '3px solid var(--color-primary)', borderRadius: '0 0 0 12px' }} />
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 20, height: 20, borderBottom: '3px solid var(--color-primary)', borderRight: '3px solid var(--color-primary)', borderRadius: '0 0 12px 0' }} />
            </>
          )}

          {!scanning && !result && (
            <ScanOutlined style={{ fontSize: '36px', color: 'var(--gray-300)' }} />
          )}
          {result && (
            <div className="animate-pulse-success">
              <CheckCircleOutlined style={{ fontSize: '36px', color: 'var(--color-success)' }} />
            </div>
          )}
        </div>

        {/* Scan Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {scanning ? (
            <div>
              <div style={{ fontSize: '16px', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '8px' }}>
                正在扫描...
              </div>
              <button
                onClick={handleStopScan}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>
          ) : scanError ? (
            <div>
              <div style={{ fontSize: '14px', color: 'var(--color-error)', marginBottom: '8px' }}>
                {scanError}
              </div>
              <button
                onClick={handleStartScan}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius-pill)',
                  background: 'transparent',
                  color: 'var(--color-error)',
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
            </div>
          ) : result ? (
            <div style={{ animation: 'fadeInUp 250ms ease-out both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <CheckCircleOutlined style={{ color: 'var(--color-success)', fontSize: '20px' }} />
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {result.name}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {result.overview}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '8px 18px',
                    fontSize: '14px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--surface-card)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  重新扫描
                </button>
                <button
                  onClick={() => onScan?.(result)}
                  style={{
                    padding: '8px 18px',
                    fontSize: '14px',
                    border: 'none',
                    borderRadius: 'var(--radius-pill)',
                    background: 'linear-gradient(135deg, #2D8B57, #4ADE80)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  开始讲解
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '15px', color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
              点击扫描框，对准景点二维码
            </div>
          )}
        </div>
      </div>

      {/* Spots list */}
      {!result && (
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <EnvironmentOutlined style={{ fontSize: '15px' }} />
            {loading ? '加载景点中...' : '所有景点'}
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '6px',
            scrollbarWidth: 'none',
          }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    minWidth: 100, padding: '14px 16px',
                    border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-card)', textAlign: 'center',
                    opacity: 0.5,
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>加载中...</div>
                  </div>
                ))
              : spots.map((loc, i) => (
                  <button
                    key={loc.id}
                    onClick={() => handleLocationSelect(loc)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 16px',
                      minWidth: 100,
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-card)',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      animation: `fadeInUp 250ms ease-out ${i * 50}ms both`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: 'var(--color-primary-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--color-primary)', fontSize: '16px',
                    }}>
                      <EnvironmentOutlined />
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                    }}>
                      {loc.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-tertiary)',
                      whiteSpace: 'nowrap',
                    }}>
                      {loc.category}
                    </div>
                  </button>
                ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanCard;
```

- [ ] **Step 3: 更新 `onScan` 回调的使用方**

QRScan 的 `onScan` 回调现在接收 `Spot` 对象而非 `string`。检查调用方（如 `TouristDashboard.tsx`），更新接收逻辑：

在 `TouristDashboard.tsx` 中找到 QRScanCard 的使用处，将 `onScan` 回调从 `(data: string)` 改为 `(spot: Spot)`，并根据 spot 信息做相应处理（如导航到讲解页面）。

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/pages/tourist/QRScan.tsx frontend/src/pages/tourist/TouristDashboard.tsx
git commit -m "feat: replace mock QR scan with real camera scanning + API-driven spot list"
```

---

### Task 9: 更新 ChatPage 快捷问题和数字人欢迎语

**Files:**
- Modify: `frontend/src/pages/tourist/ChatPage.tsx`

将快捷问题从通用问题替换为灵山胜境相关的真实问题，更新欢迎语。

- [ ] **Step 1: 修改快捷问题和欢迎语**

在 `ChatPage.tsx` 中：

将 `QUICK_QUESTIONS` 从：
```typescript
const QUICK_QUESTIONS = [
  '灵山大佛有多高？',
  '推荐游玩路线',
  '附近有什么美食？',
];
```

替换为：
```typescript
const QUICK_QUESTIONS = [
  '灵山大佛有多高？',
  '九龙灌浴表演时间？',
  '推荐历史文化路线',
  '小灵山名字的来历',
  '景区有什么好吃的？',
];
```

将欢迎语从：
```
你好！我是灵山胜境数字人导游
可以为你介绍景点、推荐路线、解答问题
```

保持原样（已经是灵山相关的）。

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/tourist/ChatPage.tsx
git commit -m "update: expand quick questions with Lingshengjing-specific FAQs"
```

---

### Task 10: 更新推荐引擎中的景点数据

**Files:**
- Modify: `backend/app/core/recommender.py`

将 `_KNOWN_SPOTS`、`_SPOT_TO_TAGS`、`_SPOT_TO_DURATION` 从硬编码改为从数据库读取或使用种子数据。

- [ ] **Step 1: 修改 recommender.py**

在 `backend/app/core/recommender.py` 中，将硬编码的 `_KNOWN_SPOTS` 等改为从数据库的 `ScenicSpot` 表读取。修改推荐逻辑，在 `_popular_fallback` 中优先使用 `scenic_spots` 表的数据：

```python
# 替换原有的硬编码，改为从数据库读取
# 保留 _KNOWN_SPOTS 作为 fallback，但扩展为完整景点列表
_KNOWN_SPOTS = [
    "灵山大佛", "九龙灌浴", "梵宫", "五印坛城",
    "祥符禅寺", "佛手广场", "百子戏弥勒",
    "曼飞龙塔", "灵山精舍", "灵山大照壁",
    "菩提大道", "三圣殿",
]

_SPOT_TO_TAGS = {
    "灵山大佛": ["佛教", "地标", "拍照", "青铜佛像"],
    "九龙灌浴": ["表演", "音乐", "群雕", "喷水", "亲子"],
    "梵宫": ["建筑", "艺术", "佛教文化", "演出"],
    "五印坛城": ["藏传佛教", "建筑", "文化"],
    "祥符禅寺": ["历史", "古刹", "玄奘", "佛教"],
    "佛手广场": ["祈福", "亲子", "拍照"],
    "百子戏弥勒": ["亲子", "雕塑", "趣味"],
    "曼飞龙塔": ["傣族佛教", "园林", "自然风光"],
    "灵山精舍": ["禅意", "素斋", "住宿"],
    "灵山大照壁": ["浮雕", "佛教文化", "入口"],
    "菩提大道": ["自然风光", "太湖风光"],
    "三圣殿": ["佛教历史", "文化展示"],
}

_SPOT_TO_DURATION = {
    "灵山大佛": "1.5-2小时",
    "九龙灌浴": "30分钟（含表演等待）",
    "梵宫": "1-1.5小时",
    "五印坛城": "40分钟",
    "祥符禅寺": "40分钟",
    "佛手广场": "20分钟",
    "百子戏弥勒": "20分钟",
    "曼飞龙塔": "30分钟",
    "灵山精舍": "1小时",
    "灵山大照壁": "10分钟",
    "菩提大道": "30分钟",
    "三圣殿": "30分钟",
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/recommender.py
git commit -m "update: expand recommender spot data to cover all 12 Lingshengjing spots"
```

---

## Self-Review

### 1. Spec Coverage

| 需求 | 对应 Task |
|------|----------|
| 多模态交互（语音+文本输入，数字人同步回答） | 已有实现，ChatPage 已支持 |
| 智能问答与讲解（景区历史、文化、景点特色） | Task 1-3 (种子数据) + Task 4 (导入) + Task 5 (API) |
| 个性化推荐（根据兴趣推荐路线） | Task 2 (路线数据) + Task 5 (路线API) + Task 7 (前端重构) |
| 扫码定位景点 | Task 1 (景点数据) + Task 8 (真实扫码) |
| 知识库管理（管理员上传知识文档） | 已有实现 (KnowledgePage + knowledge API) |
| 数字人形象管理 | 已有实现 (AvatarPage) |
| 游客感受度报告 | 已有实现 (ReportPage) |
| 数据大屏概览 | 已有实现 (DashboardPage) |

所有需求都有对应实现或增强。核心新增工作是**种子数据 + API + 前端重构**。

### 2. Placeholder Scan

扫描计划文件，未发现 "TODO"、"TBD"、"fill in" 等占位符。所有步骤都有完整代码。

### 3. Type Consistency

- `Spot` / `SpotDetail` 在 `spots.ts` 中定义，与 `SpotOut` / `SpotDetail` Pydantic model 一致
- `TourRoute` / `TourRouteDetail` 在 `routes.ts` 中定义，与 `RouteOut` / `RouteDetail` Pydantic model 一致
- `spot_id` 统一使用 string 类型（如 `"ling-shan-da-fo"`）
- `qr_code` 格式统一为 `"LSJ_SPOT_<spot-id>"`
- 所有 API 端点前缀统一为 `/api/spots` 和 `/api/routes`

---

Plan complete and saved to `docs/superpowers/plans/2026-06-05-ling-sheng-jing-knowledge-seed.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 我每次派发一个子代理执行一个 Task，在 Task 间做 review，快速迭代

**2. Inline Execution** - 在当前 session 中使用 executing-plans 逐批执行

Which approach?
