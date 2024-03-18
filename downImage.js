import fs from "fs";
import path from "path";
import axios from "axios";
import sharp from "sharp";

// 下载所有图片并替换文章中的URL
export async function downloadAndReplaceImages(articleContent, opt) {
  const assetsFolderPath = `${opt.bookName}/${opt.dir}`;

  // 匹配两种URL
  // <img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a747e579e38246eb8700400da4c0e3bf~tplv-k3u1fbpfcp-zoom-1.image" alt="">
  // ![前端工程化](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/16efed95c98f4b669d3b6feb80e45f9e~tplv-k3u1fbpfcp-watermark.image)
  // 定义正则表达式来匹配包含 "juejin" 字符串且以图片格式结尾的 URL
  // const imgUrlRegex = /https?:\/\/.*?juejin.*?\.(?:png|jpg|jpeg|gif|bmp|webp|image)/gi;
  const imgUrlRegex = /https?:\/\/.*?juejin.*?\.(?:png|jpg|jpeg|gif|bmp|webp|image)(?:\?.*?)?/gi;

  // 提取所有匹配的图片 URL
  const imgSrcList = articleContent.match(imgUrlRegex) || [];
  // 创建目标文件夹
  if (!fs.existsSync(assetsFolderPath)) {
    fs.mkdirSync(assetsFolderPath, { recursive: true });
  }

  // 辅助函数：生成唯一的文件名
  function generateUniqueFilename(url, existingFiles) {
    const uniqueIdMatch = url.match(/[^\/]+(?=\.(?:png|jpg|jpeg|gif|bmp|webp|image))/i); // 提取URL中的唯一标识符
    let uniqueId = uniqueIdMatch ? uniqueIdMatch[0] : "";
    uniqueId = uniqueId.replace(/[^\w]+/g, "_"); // 替换非单词字符为下划线

    let filename = `${opt.index}_${uniqueId}.jpg`; // 使用 jpg 格式
    let suffix = 1;

    while (existingFiles.includes(filename)) {
      filename = `${opt.index}_${uniqueId}_${suffix}.jpg`;
      suffix++;
    }

    return filename;
  }

  // 下载图片到本地并转换格式
  async function downloadImage(imgSrc) {
    // 去除 URL 中的问号及其后的内容
    imgSrc = imgSrc.replace(/\?.*$/, "");

    const response = await axios({
      url: imgSrc,
      method: "GET",
      responseType: "arraybuffer", // 设置响应类型为 arraybuffer
    });

    // 获取目标文件夹下的所有文件，用于检查重复文件名
    const existingFiles = fs.readdirSync(assetsFolderPath);
    const imageName = generateUniqueFilename(imgSrc, existingFiles); // 生成唯一的文件名
    const localImagePath = path.join(assetsFolderPath, imageName);

    // 转换成 jpg 格式
    const imageBuffer = Buffer.from(response.data);
    await sharp(imageBuffer).toFormat("jpeg").toFile(localImagePath);

    return `./${opt.dir}/${imageName}`;
  }

  // 下载所有图片并替换文章中的URL
  const localImagePaths = await Promise.all(imgSrcList.map(downloadImage));
  imgSrcList.forEach((imgSrc, index) => {
    // console.log('imgSrc',imgSrc)
    // console.log('localImagePath',localImagePaths[index])
    // 在 articleContent 中查找并替换对应的图片 URL
    articleContent = articleContent.replace(imgSrc, localImagePaths[index]);
  });

  return articleContent;
}
