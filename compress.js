const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');

const root = './input',
  exts = ['.jpg', '.png'],
  max = 5200000; // 5MB == 5242848.754299136

const options = {
  method: 'POST',
  hostname: 'tinypng.com',
  path: '/web/shrink',
  headers: {
    rejectUnauthorized: false,
    'Postman-Token': Date.now(),
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
  }
};


var allImagePath = new Array();
//访问一个文件夹下所有的文件
function visitSingleFolderAllFile(root){
  fs.readdir(root, function(err, files){
      (function iterator(i){
        if(i == files.length) {
          let len = allImagePath.length;
          
          
          setTimeout(function(){
            if(allImagePath.length==len)
            {
                console.log("等待500毫秒 跳出递归");
                start();
            }
          },500)
          return ;
        }
        fs.stat(path.join(root, files[i]), function(err, data){     
          if(
              // 必须是文件，小于5MB，后缀 jpg||png
              data.size <= max &&
              data.isFile() &&
              exts.includes(path.extname(files[i]))
            )
          {               
              allImagePath.push(path.join(root, files[i]));
          }
          if (data.isDirectory()) visitSingleFolderAllFile(path.join(root, files[i]) + '/');
          iterator(i+1);
         });   
      })(0);
  });
}
visitSingleFolderAllFile(root);


//开始压缩
var step = -1;
function start(isAdd=true){
    if(isAdd)
    step++;
    let imgpath = allImagePath[step];
    imgpath = imgpath.replace("\\\\", "\/\/");
    imgpath = imgpath.replace("\\", "\/");
    imgpath = imgpath.replace("\\", "\/");
    fileUpload(imgpath);   
}

// 异步API,压缩图片
// {"error":"Bad request","message":"Request is invalid"}
// {"input": { "size": 887, "type": "image/png" },"output": { "size": 785, "type": "image/png", "width": 81, "height": 81, "ratio": 0.885, "url": "https://tinypng.com/web/output/7aztz90nq5p9545zch8gjzqg5ubdatd6" }}
function fileUpload(img) {
  var req = https.request(options, function(res) {
    res.on('data', buf => {
      console.log("buf----",buf);
      let obj = JSON.parse(buf.toString());
      if (obj.error) {
        console.log(`[${img}]：压缩失败！报错：${obj.message}`);
         setTimeout(function() {
                start(false);
            }, 100);

      } else {
         fileUpdate(img, obj);
      }
    });
  });

  req.write(fs.readFileSync(img), 'binary');
  req.on('error', e => {
    console.error(e);
  });
  req.end();
}
// 该方法被循环调用,请求图片数据
function fileUpdate(imgpath, obj) {
  let options = new URL(obj.output.url);
  let req = https.request(options, res => {
    let body = '';
    res.setEncoding('binary');
    res.on('data', function(data) {
      body += data;
    });

    res.on('end', function() {
      let temp = imgpath.split("/");
      let newpath = "./"+imgpath.replace(temp[0],"output");
          let lastPath = newpath.split("/");
          let targetDir = "";
          for(let j = 0;j<lastPath.length-1;j++)
          {
              if(j!=0)
              targetDir = targetDir + "/"+ lastPath[j];
              else
              targetDir = targetDir + lastPath[j];
          }
          console.log("待创建---",targetDir);
          mkdirs(targetDir,()=>{
                 fs.writeFile(newpath, body, 'binary', err => {
                    if (err) return console.error(err);
                    start();
                    console.log(
                      `[${newpath}] \n 压缩成功，原始大小-${obj.input.size}，压缩大小-${
                        obj.output.size
                      }，优化比例-${obj.output.ratio}`
                    );
                  });
          })
    });
  });
  req.on('error', e => {
    console.error(e);
  });
  req.end();
}

// 递归创建目录 异步方法  
function mkdirs(dirname, callback) {  
    fs.exists(dirname, function (exists) {  
        if (exists) {  
            callback();  
        } else {  
            // console.log(path.dirname(dirname));  
            mkdirs(path.dirname(dirname), function () {  
                fs.mkdir(dirname, callback);  
                console.log('在' + path.dirname(dirname) + '目录创建好' + dirname  +'目录');
            });  
        }  
    });  
}  
// 递归创建目录 同步方法
function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
      return true;
    } else {
      if (mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
      }
    }
  }

