---
title: 我从 Hacker News 中学到了什么？
date: 2022-02-20
tags:
  - 改变
  - Hacker News
---

昨天看到 Hacker News 的创始人 Paul Graham 在 2009 年写的一篇文章[《我从 Hacker News 中学到了什么》](http://www.paulgraham.com/hackernews.html), 作者提到：

> 随着 Hacker News 变得越来越大，占用的时间比我预期的要多，但我并不后悔，因为我从工作中学到了很多东西。

就挺感慨的，一方面是我亲自做了一遍 HN 的中文翻译，在整个过程中学到了很多，另一方面也让我回想起大学期间做的一个社区，对我的之后的种种影响。

如果有机会的话，我觉得每个人都应该尽可能的去亲自参与创造某个能有其他人一起创造信息的社区，比如成立一个小组，一个论坛，一个社群等等，线下的可能更好。和人交流，能碰撞出我更多的想法，以及让我知道更大的世界，更多元的价值观。

[hacker news 的中文翻译](https://hn.buzzing.cc)是一个非常普通的想法，每年可能都有人声称自己做了一个 HN 的中文版。因为 HN 上不仅文章质量普遍优质，而且最重要的是： HN 的 API 是业界最友好的，所有人都可以用来练手，做一个 HN 的 XX 版，比如各种平台的客户端，各种语言的实现，rss 服务，email 订阅，评论通知，大数据分析，newsletter 等等，不胜枚举。由于我的英文水平并不能像母语一样让我能快速找到感兴趣的东西（后来发现其实不少看起来英文很好的人，也有类似的体验），所以如果我想阅读 HN 的话，我可能有 2 个选择：

1. 抱着锻炼自己英语的想法逼迫自己不太流利的浏览 HN
2. 使用浏览器自带的翻译功能，浏览 HN

这两个阶段我都经历过。我希望你不要经历，因为每个阶段都可能使你错过 HN，错过一个很优质的信息源。

第一个阶段，我只能坚持几天，然后就会本能的优先去看其他中文信息，慢慢的其实就没在看 HN 了。这在我的推特账号上尤其明显，我注册了 2 个推特号，一个是英文号[@TheOwenYoung](https://twitter.com/TheOwenYoung),一个是中文号[@OwenYoungZh](https://twitter.com/OwenYoungZh)，本来是先开英文号的，专门关注的都是些英文博主，但是后面实在受不了了，说那就再开个中文号，尽量少关注人，只发一些东西。后来的故事就是，英文号上的很少，主力变成了中文号。唉，人就是离不开舒适圈，所以我们最好不要给自己创造舒适圈，比如在浏览器上设置很多社交网络的快捷书签；新 tab 页放很多快捷入口；手机上下载很多好用的应用；如果想克制自己，就最好只下必要应用，优先用网页版，或者像我现在做的，把 iPhone13 当成测试机，用一台好几年前的 Pixel 3a，又卡，掉电还快，但是用起来其实完全没问题，然后我又重新开始用 Kindle，只能一个操作，就是下一页，这样就能节省很多时间来看书了。

第二个阶段，我发现浏览器自带的翻译功能并不是太好用（去年我开始做 hn 中文版的时候更不好用，现在其实好了很多），比如有一些网页它会失败，要么就是要重试，然后排版也不太好看，我更希望的是有些区域不要翻译，只翻译标题之类的，但是浏览器会全部翻译，就不太好浏览。

正好去年那会儿，刚做完[Actionsflow](https://github.com/actionsflow/actionsflow), 想利用 Actionsflow 做点什么，所以说那就做一个 HN 的中文翻译吧，这很适合工作流去处理，处理完之后生成一个静态网页，就算没人用，我自己也可以天天用，做好之后也不用维护，就一直在那。于是就开干，没想到做到后面发现还可以顺便做点别的我感兴趣的英文内容翻译，比如[Reddit 的美股讨论](https://reddit.buzzing.cc)，[国外的权威媒体报道](https://news.buzzing.cc)，[ProductHunt](https://ph.buzzing.cc)等等，最后就汇总成了一个[Buzzing](https://www.buzzing.cc)

Buzzing 运行了一年之后，发现之前的设计有不少欠考虑的地方，[Actionsflow](https://github.com/actionsflow/actionsflow)也有点太重了，尤其是看了一年 HN 的帖子后，觉得 Actionsflow 的设计简直就是一坨屎，又臭又长。这个时候[才发现 Deno 是最适合做工作流的运行时](https://twitter.com/OwenYoungZh/status/1478928692781137925)，Deno 的依赖只需要 URL，天生适合脚本。这样就可以和`package.json`,`package-lock.json`,`node_modules`地狱说拜拜了，而且我的工作流也不用再依赖 Docker 和[act](https://github.com/nektos/act)了，于是过了 10 多天之后，我开始着手做了一个史上最快兑现的 「如果我有时间，我一定要做 XXX 」的项目：[Denoflow](https://twitter.com/OwenYoungZh/status/1485381401327267840),用来做我的低代码 IFTTT 或者说 Zapier，用流行一点的话说，这是配置即代码。

这一次，产生了一些变化，在泡了一年自己做的 HN 中文版之后。

1. 首先我没有像 Actionsflow 一样设计一个浮夸的[Landing 页](https://actionsflow.github.io/).
2. 其次我没有用自己蹩脚的英语凑成一个看起来功能很丰富，维护人员很多，很正规的[一个文档网站](https://actionsflow.github.io/docs/reference/)。我只在项目的[Readme 文件](https://github.com/denoflow/denoflow)里写了一个我自认为很诚恳的说明，在一页的文本里说清楚这个项目的用途，和看一个示例就能明白的使用方法，没有多余的营销话语，把时间真正花在工具本身，利用省下的时间做了一个[在线 PlayGround](https://playground.owenyoung.com/)，运行在我的廉价 VPS 上。
3. 没考虑买一个域名，尽管`denoflow.com`域名还在。直接放在我的个人子域`playground.owenyoung.com`.
4. 版本号的克制，对于刚推出的项目，我使用`0.0.x`，而不是像 Actionsflow 一样，一上来就是`1.0.0`。而后来的证明，`0.0.x`是最适合这个项目的，因为在后来的使用中，发现了不少的致命 bug
5. 在文档的显眼处声明：`项目仍处于非常早期的阶段，谨慎使用!`
6. 仔细思考了项目的 License,选择了 Apache2.0

做完之后，又花了 2 个小时，用 Denoflow 做了[Show HN](https://showhn.buzzing.cc/),[Ask HN](https://askhn.buzzing.cc/),[HN 首页](https://hackernews.buzzing.cc/),[Best HN](https://besthn.buzzing.cc)，这里可以和之前的[HN 热门](https://hn.buzzing.cc)对比下，没有追踪，没有 JS 代码，只是使用一个舒服的背景色，使用[class less 原则](https://github.com/dbohdan/classless-css)，同时生成一个 RSS。没有使用任何框架，就几句简单的 deno 代码即可生成。和之前的[HN 热门](https://hn.buzzing.cc)相比，[HN 热门](https://hn.buzzing.cc)在一个屏幕里只能显示出 2 篇文章，而现在[HN 首页](https://hackernews.buzzing.cc/)可以放 20 多篇，效率直接提升 10 倍啊有木有。

很快，我发现这些已有的时间流，我不够看了，所以我索性单独为我自己生成一个[HN 时间流](https://myfeed.owenyoung.com/)，里面包含了 hn 上前 100 位用户提交的任何帖子。

几天之后我就发现，之前只看 HN 的热门帖子损失有多大，HN 上有太多优秀的内容没有被顶上去了。所以，我又做了一个变化，直接抓取 HN 上最新的提交（我去掉了 Ask HN 的内容，因为 Ask HN 的质量相对较差，并且我还有专门的[Ask HN](https://ask.buzzing.cc)可以回头再看），所以现在专属于我的[HN 时间流](https://myfeed.owenyoung.com/)包括了 HN 上最新的全部文章了。即使是全部文章，由于是母语阅读，我还是能快速读完这些标题，找到感兴趣的内容，还可能留下我的 2 cents.

如果有人看到这里的话，那你一定会觉得 HN 有毒，而我已经上瘾了。其实没错，目前阶段是这样。

好在 HN 上的人也经常推荐图书，比如以下两个链接就是 HN 的用户制作的 HN 评论大数据最推荐的书（HN 的评论比图书网站，或者第三方网站更可信）：

- [汇总了 hacker news 上评论里提到的书籍的排名](https://hacker-recommended-books.vercel.app/)
- [又一个 hacker news 提到的图书周报](https://hackernewsbooks.com/top-books-on-hacker-news)

比如我读了上面推荐的[《深度工作》](https://d.buzzing.cc/post/1)，作者提到：

> “如果在你全部的清醒时间，都能给自己的大脑找到有意义的事情去做，而不是放任自己在迷糊的状态下漫无目的地浏览几个小时网页，那么在一天结束时，你会觉得更加充实，第二天开始时更加轻松。
> – 卡尔·纽波特《深度工作》

从我沉迷 HN 的例子里就能看出，网络已经剥夺了我保持专注和沉思的能力，但是真正值得探索和学习的知识都需要我拥有这种能力。如果我没有在某一个特定时段给自己安排任务，那么这些网站总是会更有诱惑力。所以如果我想抵御社交网络对我时间和精力的诱惑，那么必须要给大脑找一些高质量的替代活动，所以我基于开源 [Lemmy](https://lemmy.ml/) 搭建了一个类似 Reddit 的社区，叫[**如何度过每一天**](https://d.buzzing.cc/),希望能在社区里分享有意义的事，不虚度光阴的事，可以是阅读某本书，学习某项技能，看某部纪录片等等等等。社区有投票的功能，某项活动被投票的次数越多，说明认为这项活动有意义的更多。

目前其实就只有少数几个用户在用，网站依然是部署在我的一个 廉价 VPS 上，没有盈利的打算，目前加载也有点慢，但是够用。

以上是我在 Hacker News 上学到的一些东西。
