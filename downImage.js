import fs from "fs";
import path from "path";
import axios from "axios";
import sharp from "sharp";

// 下载所有图片并替换文章中的URL
export async function downloadAndReplaceImages(articleContent, opt) {
    const assetsFolderPath = `${opt.bookName}/${opt.dir}`
    // 定义正则表达式来匹配图片URL和图片名字
    const imageUrlRegex = /!\[(.*?)\]\((.*?)\)/g;

    // 提取图片URL和图片名字
    const imageInfoMatches = [...articleContent.matchAll(imageUrlRegex)];
    const imageInfoList = imageInfoMatches.map(match => ({
        name: match[1],
        url: match[2]
    }));

    // 创建目标文件夹
    if (!fs.existsSync(assetsFolderPath)) {
        fs.mkdirSync(assetsFolderPath, { recursive: true });
    }

    // 辅助函数：生成唯一的文件名
    function generateUniqueFilename(url, existingFiles) {
        const uniqueIdMatch = url.match(/[^\/]+(?=\.image)/); // 提取URL中的唯一标识符
        let uniqueId = uniqueIdMatch ? uniqueIdMatch[0] : '';
        uniqueId = uniqueId.replace(/[^\w]+/g, '_'); // 替换非单词字符为下划线

        let filename = uniqueId + '.jpg'; // 使用 jpg 格式
        let suffix = 1;

        while (existingFiles.includes(filename)) {
            filename = `${uniqueId}_${suffix}.jpg`;
            suffix++;
        }

        return filename;
    }

    // 下载图片到本地并转换格式
    async function downloadImage(imageInfo) {
        const { name, url } = imageInfo;
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer' // 设置响应类型为 arraybuffer
        });

        // 获取目标文件夹下的所有文件，用于检查重复文件名
        const existingFiles = fs.readdirSync(assetsFolderPath);
        const imageName = generateUniqueFilename(url, existingFiles); // 生成唯一的文件名
        const localImagePath = path.join(assetsFolderPath, imageName);

        // 转换成 jpg 格式
        const imageBuffer = Buffer.from(response.data);
        await sharp(imageBuffer).toFormat('jpeg').toFile(localImagePath);

        const contentImagePath = `./${opt.dir}/${imageName}`

        return contentImagePath;
    }

    // 下载所有图片并替换文章中的URL
    const localImagePaths = await Promise.all(imageInfoList.map(downloadImage));
    localImagePaths.forEach((contentImagePath, index) => {
        articleContent = articleContent.replace(imageInfoList[index].url, contentImagePath);
    });

    return articleContent;
}
