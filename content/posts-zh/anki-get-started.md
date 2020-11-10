---
title: Anki背单词必備的3个插件
date: 2020-11-10
tags:
  - anki
  - 學習
  - 英文
---

用了那麼多背單詞軟件，發現還是[Anki](https://ankiweb.net/)好用，我覺得其中最好用是 Anki 提供的強大的 Tag 功能，你可以給每個單詞打上一個 Tag，這樣方便你日後歸類來複習這些單詞，比如你可以有一個「hard」的 Tag。

Tag 是 Anki 官方提供的功能，你可以直接在 Anki 上管理 tag，但是默認的 tag 管理比較不夠便捷，所以如果配合以下插件，就能更方便的添加，查看 Tag。

這裏紀錄下我的 Anki 配置，希望你也能用得著。最终效果如下：

![](https://i.imgur.com/WF5posJ.png)

## 預先準備

- [下載 Anki 桌面版](https://apps.ankiweb.net/)
- [下載一個詞庫][https://ankiweb.net/shared/decks/] - 可選，我初學的時候用的是這個排名第一的 [4000 Essential English Words 英英](https://ankiweb.net/shared/info/1104981491)

## 必備插件

下載插件是在「Tools->Add-ons->Get Add-ons」,輸入插件的 Code，插件的 Code 在插件主頁上找到，[點擊這裏](https://ankiweb.net/shared/addons/2.1)可以瀏覽所有的插件。

> Note: 每次安裝完插件後，重啟才能生效。

### 1. [Quick tagging](https://ankiweb.net/shared/info/304770511)

Code: `304770511`

這個插件用來在 review 時，用快捷鍵快速添加 tag，默認是「q」鍵，你可以配置自己常用的 tag，比如「h」鍵添加一個「hard」標籤。

以下是我的配置(其實就只是加了一個 hard 快捷鍵)：

```json
{
  "add tag shortcut": "q",
  "edit tag shortcut": "w",
  "quick tags": {
    "Ctrl+Shift+B": {
      "action": "bury note",
      "tags": "burynote"
    },
    "Shift+B": {
      "action": "bury card",
      "tags": "burycard"
    },
    "Shift+S": {
      "action": "suspend card",
      "tags": "suspend"
    },
    "h": {
      "action": "again card",
      "tags": "hard"
    }
  }
}
```

### 2. [Clickable Tags ](https://ankiweb.net/shared/info/380714095)

Code: `380714095`

接下來就是這個 Clickable Tags 插件了，上一個插件解決了添加 Tag 的問題，這個插件解決顯示 Tag 的問題，用了這個插件後你可以把這個單詞所屬的 Tag 都顯示在 Review 頁面，並且可以隨時點擊進去查看同個 Tag 的所有單詞。效果如下：

![](https://raw.githubusercontent.com/luoliyan/anki-misc/master/screenshots/clickable-tags.png)

安裝完成後，你需要在你的單詞模板里插入一個佔位符來作為顯示 Tag 的地方，步驟如下：

![](https://i.imgur.com/2i6eVt4.png)

點擊「Cards」，選擇「Back Template」，在合適的地方插入 `{{clickable:Tags}}`

![](https://i.imgur.com/xVZHyjW.png)

保存並重啟 Anki，你就會在卡片背面看到單詞的 Tags（如果有 Tag 的話）

### 3. [Tag Entry Enhancements v2](https://ankiweb.net/shared/info/536796161)

Code: `536796161`

这个插件提供标签输入增强的，提供了以下功能：

- 添加 Return / Enter 作為熱鍵以應用第一個建議的標籤
- 將 Ctrl + Tab 作為熱鍵添加以在建議列表中移動
- 輸入字段時禁用初始建議框彈出窗口
- 允許使用 ↑/↓ 調用標籤建議框

安装后重启即可使用

## 總結

總之，我使用 Anki 的重度功能就是這個 Tag，背到某個單詞的時候，可以看到你標記的同類單詞，這樣更不容易忘記。
