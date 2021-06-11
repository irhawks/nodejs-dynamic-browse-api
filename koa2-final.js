var Koa = require("koa");
var Router = require('koa-router');
var app = new Koa();
var router = new Router();

var argv = require('yargs').argv;
var sleep = require('sleep');

const cheerio = require('cheerio');

function randomInt(low, high) { return Math.floor(Math.random() * (high - low) + low) }

let browser;

(async () => { 
  const puppeteer = require('puppeteer'); 
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 250
  }); 
})() 

async function openNewPage(browser) {
  const page = await browser.newPage();
  const session = await page.target().createCDPSession();
  await session.send("Page.enable");
  await session.send("Page.setWebLifecycleState", { state: "active" });
  await page.evaluate(() => { return })
  // set mobile headers if required
  if (argv.mobile) {
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 6.0.1; SM-G532G Build/MMB29T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.83 Mobile Safari/537.36');
  }
  await page.setViewport({width: 1024,height: 2048});
  await page.emulateMedia('screen');
  return page
}

async function navigatePage(page, url) {
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  //await page.goto(req.query.url, { waitUntil: 'networkidle2' })

  // toutiao mobile side (you should click that
  // TODO: check website based on page.url (e.g. if url ~= 'www.toutiao.com')
  if (page.url().match(/toutiao.com/) && argv.mobile) {
    await page.evaluate( () => document.querySelector('.unflod-field__mask').click() );
  }
  if (page.url().match(/baijia.baidu.com/) && argv.mobile) {
    await page.evaluate( () => document.querySelector('.packupArrow').click() );
  }
  if (page.url().match(/www.jianshu.com/) && argv.mobile) {
    await page.evaluate( () => document.querySelector('.close-collapse-btn').click() );
  }
  // TODO: csdn allows only desktop version to show all images
  if (page.url().match(/blog.csdn.net/) && argv.mobile) {
    await page.evaluate( () => document.querySelector('.read_more_btn').click() );
  }
  if (page.url().match(/blog.csdn.net/) && !argv.mobile) {
    await page.evaluate( () => document.querySelector('.btn-readmore').click() );
  }

  // navigate the page
  if (argv.scroll) {
    sleep.sleep(5);
    for (var i = 0; i < 12; i++) {
      await page.keyboard.press('PageDown');
      await page.waitFor(randomInt(50, 300));
      console.log("Scrolling " + i)
    }
  }
}

// save only specified html element rather than whole html
async function getHtml(page) {
  var html = await page.content(); // rendered pages
  if (argv.selectors) {

    console.log("applying selectors.");
    $ = cheerio.load(html, {decodeEntities: false});

    if (page.url().match(/item.jd.com/)) {
      if (!argv.mobile) { return $('#J-detail-content').html(); }
      return $('#commDesc').html();
    }
  }
  return html
}

async function getPdf(page) {
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '1.5cm', left: '2cm', right: '1.5cm', bottom: '1.5cm' }
    });
    return pdf
}

async function getPng(page) {
  // await page.screenshot({path: filename, fullPage: true})
  return await page.screenshot({fullPage: true})


}

async function getTitle(page) {
  if (page.url().match(/baijia.baidu.com/)) {
    return await page.evaluate(() => document.querySelector('.titleTxt').innerText);
  }
  if (page.url().match(/wx.qq.com/)) {
    await page.evaluate(() => document.querySelector('#activity-name').innerText);
  }
}

// =========================================================================
// TODO: rewrite params to query (scroll, baidubaijia, etc)
// params
// url: url to download
// scroll: scroll or not, scroll = 0, scroll=10
// selectors: apply selectors to html page
// mobile: use mobile browser headers or not

router.get('/api/v1/:file_type', async (ctx, next) => {

  	console.log("params ...", ctx.query);
  	console.log("url", ctx.query.url, ", save as", ctx.params.file_type);

    const page = await openNewPage(browser); 
    await navigatePage(page, ctx.query.url);

    if (ctx.params.file_type == 'pdf') {
      const pdf = await getPdf(page);
      ctx.status = 200;
      ctx.set('content-type', 'application/pdf');
      ctx.set('cache-control', 'public,max-age=31536000')
      ctx.body = pdf;
    }
    if (ctx.params.file_type == 'html') {
      var html = await getHtml(page); // rendered pages
      ctx.body = html;
    }

    await page.close();

})

// =========================================================================

var server = app.use(router.routes()).use(router.allowedMethods()).listen(5001, "0.0.0.0", function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port)
})

