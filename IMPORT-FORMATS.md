# 六级喵 V2.0 资料格式

资料默认仅在设备上处理。`source` 保留实际来源和使用范围；示例是原创模拟练习，不代表六级官方真题。未知音标、例句、年份允许留空；词条英文/释义、阅读答案及解析不得编造。年份在JSON中填数字或 `null`。

## 词库：资料中心

JSON：数组或含 `words` 数组；CSV同名字段作表头，UTF-8，逗号/换行内容用双引号包裹，内部双引号写两次；JSONL每行一个词对象，无外层数组。

```json
{
  "source":{"kind":"user-provided","label":"本人整理的学习笔记","rights":"本人持有内容使用权，仅个人学习"},
  "year":null,
  "words":[{
    "word":"acquire","ipa":"","pos":"v.","meaning":"获得；学到",
    "example":"","translation":"","collocations":"","association":""
  }]
}
```

字段 `word`、`meaning` 必填；其余留空，不自动补写。`association` 为辅助记忆，不冒充词源。中文CSV表头支持：英文/单词、释义/中文释义、音标、词性、例句、例句翻译、搭配、联想、来源、年份、许可。CSV的来源字符串与 `rights` 可以逐行填写，也可在预览批量补充。

兼容已有JSONL转换字段：`translations:[{translation,type}]`、`uk`/`us`、`phrases:[{phrase,translation}]`、`sentences:[{sentence,translation}]`。采用已有音标，连接已有释义/词性/搭配，取首条英文例句与翻译，不生成不存在的信息。导入器会校验字段长度；过长或缺失字段需在预览中编辑。支持格式不代表已取得该外部数据版权许可；不得据此将外部词库直接打包公开发布。

去重以英文规范形式（忽略大小写/多余空格）为准，同时检查内置、个人、资料中心和本批次。词条ID固定，新词不会替换已学词。有效词条可单独确认，坏词条保留预览以供修复。文件整体JSON语法损坏/CSV引号无法闭合时，因无法可靠确定记录边界而拒绝整个文件。

模板：[CSV](materials-word-template.csv)、[JSON](materials-word-template.json)。单文件≤10MiB，单批≤5000条，资料文本库总量≤6MiB/5000条。

## 仔细阅读：资料中心

模板：[materials-reading-template.json](materials-reading-template.json)，完整旧示例：[reading-template.json](reading-template.json)。外层可为 `{"articles":[...]}` 或文章数组。每篇字段：

- `id`：固定且唯一，英文数字/连字符/下划线/冒号；同ID不会覆盖不同文章。
- `type:"reading-careful"`、`title`、`source:{kind,label,rights}`、`year`。
- `paragraphs:[{id,text}]`：1–50段，段落ID唯一。
- `questions:[{id,type:"single-choice",stem,options:[{id,text}],answer,explanation}]`：1–30题，每题2–6选项。
- `explanation:{summary,paraphrase,evidence:[{paragraphId,quote}],distractors:{选项ID:解释}}`。

`answer` 必须是选项ID，`quote` 逐字出现在对应原文段落中，每个错误选项都要有干扰原因。依据、答案或许可缺失需人工补齐，应用不猜测。原字段 `audioUrl` 仅作旧格式元信息保留，不自动加载远程音频。

## 听力：听力训练室

模板：[listening-template.json](listening-template.json)。原文文件≤5MiB，外层为数组、单份对象或 `{"lessons":[...]}`。

```json
{
  "lessons":[{
    "id":"my-audio-001","type":"listening","title":"我的合法听力资料",
    "source":{"kind":"user-provided","label":"填写真实出处","rights":"填写实际使用许可"},
    "year":null,
    "segments":[{"id":"s1","start":0,"end":4.5,"text":"Your own transcript goes here.","translation":"可选，留空也可以。"}]
  }]
}
```

逐句 `start`/`end` 为秒，可带小数；按开始时间排序，结束必须晚于开始，句ID唯一。每份1–500句，最多200份材料。手动校对时间轴与实际音频是否对应。导入时不会信任外部 `audioId` 或自动下载音频；添加原文后为当前练习选择本地MP3/WAV/M4A/OGG。单文件≤25MiB，本机音频总量≤60MiB/200个，iOS解码支持以系统为准。

预览显示有效/错误/重复项，确认后仅新增有效资料。相同ID或相同时间轴/原文跳过；已移除但有历史进度的ID保留，新的不同练习须换新ID。移除练习不会删除文件或听写历史；音频可在设置中单独删除。解除配对不删除文件。

## 写作与翻译：写作页

模板：[writing-template.json](writing-template.json)。文件≤5MiB，外层为数组、单题或 `{"prompts":[...]}`。

```json
{
  "prompts":[{
    "id":"my-writing-001","type":"writing","title":"我的作文练习",
    "prompt":"填写你拥有使用权的题干。","minutes":30,
    "template":"可选思路提示，不填可留空。","reference":"可选参考文本。",
    "source":{"kind":"user-provided","label":"真实来源","rights":"实际使用范围"},"year":null
  }]
}
```

翻译使用 `type:"translation"`，`prompt` 填中文待译段落。时长1–180分钟；最多500题。`id`需唯一且稳定，同ID/同题干/归档草稿ID不会被覆盖。应用提供版本和自查，不生成主观题自动分数。

## 来源与许可

`source.kind` 取 `original`（自有原创）、`user-provided`（用户提供）、`licensed`（确获授权）、`public-domain`（确为公有领域）。`label` 说明出处，`rights` 说明实际拥有的使用范围。公开可访问/仓库有LICENSE不自动等于所有上游例句、试题和录音都可以公开再分发。

## 统一存储和备份

资料中心沿用 `schema:1`、`kind:vocabulary|reading`、稳定 `id`、`meta:{source,year}`、`payload`、`review` 与时间戳。听力/写作沿用上述统一的 `id/type/source/year` 元信息，业务内容分别为 `segments` 与 `prompt/reference/template`，音频单独以 `audioId` 引用Blob，未来可以扩展题型而不更改旧词ID。

整站备份保持旧主数据 `version:2`，新增 `platform.schema:1`，导出标记 `backupFormat:"liujimiao-full"` / `backupVersion:2`，包含 `materialsBackup` 和 `mediaAssets`（音频ID、名称、MIME、大小、SHA-256、base64）。**不要把整站备份选入词库导入器**；使用设置页“选择JSON备份”恢复。不要将个人整站备份上传公开GitHub。
