const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const writeStream = fs.createWriteStream('post.csv');
const url = 'https://www.dcard.tw/service/api/v2/posts?popular=true&limit=100&before=235882865';

async function grabContent(link) {
    try {
        const response = await axios({
            method: 'get',
            url: link,
            // headers:{
            //     Cookie: 'over18=1'
            // }
        });
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

async function grabFirstArticleId(link) {
    const html = await grabContent(link);
    const $ = cheerio.load(html);
    const postUrl = $('[data-index=1]').find('a').first().attr('href');
    const postArray = postUrl.split('/');
    const postId = postArray[postArray.length - 1];
    return postId;
}

async function grabKArticlesBeforeId(k, id) {
    const url = `https://www.dcard.tw/service/api/v2/posts?popular=true&limit=${k}&before=${id}`;
    const contents = await grabContent(url);
    return contents;
}

async function grabMoreArticles(link, k) {
    const times = Math.floor(k / 100);
    const rest = k - 100 * times;
    const firstId = await grabFirstArticleId(link);
    let id = firstId;
    const allContents = [];
    if (rest > 0) {
        let contents = await grabKArticlesBeforeId(rest, firstId);
        allContents.push(contents);
    }
    for (let i = 0; i < times; i++) {
        if (i !== 0 || rest > 0) {
            id = contents[contents.length - 1].id;
        }
        contents = await grabKArticlesBeforeId(100, id);
        allContents.push(contents);
    }
    return [].concat(...(allContents));
}

async function main(link, k) {
    const contents = await grabMoreArticles(link, k);
    writeStream.write(`Title, Link, Date, CommentsNb, LikesNb \n`);
    for (let content of contents) {
        let date = content.updatedAt.slice(0, 10);
        writeStream.write(`${content.title}, http://www.dcard.tw/f/${content.forumId}/p/${content.id}, ${date}, ${content.commentCount}, ${content.likeCount} \n`);
    }
}

main('https://www.dcard.tw/f', 1000);