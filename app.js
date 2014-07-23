/*
 * Module dependencies
 */
var express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')

var fs = require('fs'),
    path = require('path'),
    gm = require('gm').subClass({ imageMagick: true })

var app = express()
function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}
var folder
var tag

function readJSONFile(filename, callback) {
  require("fs").readFile(filename, function (err, data) {
    if(err) {
      callback(err);
      return;
    }
    try {
      callback(null, JSON.parse(data));
    } catch(exception) {
      callback(exception);
    }
  });
}

function getDirs(rootDir){
    return fs.readdirSync(rootDir).filter(function (file) {
     return fs.statSync(rootDir+'/'+file).isDirectory();
  });
}

//No Cashing of Pages in Safari -> preventing white page
app.all('*', function(req, res, next) {
  var agent;
  agent = req.headers['user-agent'];
  if (agent.indexOf('Safari') > -1 && agent.indexOf('Chrome') === -1 && agent.indexOf('OPR') === -1) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', 0);
  }
  return next();
});

app.configure(function() {
  app.use(express.bodyParser());
})
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
))
app.use('/public',express.static(__dirname + '/public'))
app.use('/images',express.static(__dirname + '/images'))
app.get('/', function (req, res) {
  folder = req.query.folder
  tag = req.query.tag
  //TODO check if double TAG

  if (!tag){tag="0"}
   var tagArray = tag.split(',')
   if (req.query.sub){
    var delTag=tagArray.indexOf(req.query.sub);
    if (delTag>-1){tagArray.splice(delTag,1)}
    tag=tag.replace(','+req.query.sub,'')
   }
   var selTagsjade = []
   for (var i = 0; i<tagArray.length;) {
    selTagsjade.push({tagssel:tagArray[i]});
     i = i+1;
   }
   if (req.query.add){
    selTagsjade.push({tagssel:req.query.add});
    tag=tag+','+req.query.add
   }
   var tagArrayNew=tag.split(',')
   var shouldfind=tagArrayNew.length-1
  readJSONFile("./public/tags.json", function (err, json) {
    if(err) { throw err; }
    var tagsjade = []
    for (var i = 0; i<json.tags.length;) {
	 tagsjade.push({tagsname:json.tags[i].name});
	i = i+1;
    }
    if (!folder || folder==''){
     console.log("TAGs")
     var folderTemp=[]
     var files=[]
     var directories=getDirs('./images')
     var selDirectory,selfiles,pushfile,pushfolder, pushImage
     var found=0
     console.log("shouldfind: "+shouldfind)
     var processFiles = function(callback){
       json.tags.forEach(function processF(getAllTags){
        console.log("tag in json: "+getAllTags.name)
        tagArrayNew.forEach(function processT(getAllT){
         console.log("searched Tag: "+getAllT)
         if (getAllT==getAllTags.name){
	      getAllTags.members.forEach(function getFiles(memberTag){
	      	if (found==0){
		 		selDirectory=directories[memberTag.folder]
		 		pushImage=memberTag.image
		 		selfiles=fs.readdirSync('./images/'+selDirectory+'/thumbs/').filter(function(v){return v[0]!='.'})
		 		pushfile='/images/'+selDirectory+'/thumbs/'+selfiles[memberTag.image]
		 		pushfolder=memberTag.folder
		 		found=found+1
		 		console.log("found: "+found)
		 	}else{
			 	if(memberTag.folder==pushfolder && memberTag.image==pushImage){
				 	selDirectory=directories[memberTag.folder]
				 	pushImage=memberTag.image
				 	selfiles=fs.readdirSync('./images/'+selDirectory+'/thumbs/').filter(function(v){return v[0]!='.'})
				 	pushfile='/images/'+selDirectory+'/thumbs/'+selfiles[memberTag.image]
				 	pushfolder=memberTag.folder
		 			found=found+1
		 			console.log("found: "+found)
			 	}
		 	}
	      })
	     }
	    })
	   })
	   if (found==shouldfind){
	    	files.push(pushfile)
			folderTemp.push(pushfolder)
			console.log("files: "+files)
			res.render('index',
      	{ title : 'Home', names : files, dir : folderTemp, folders : directories, selFolder : selDirectory, tags:tagsjade, selTags:selTagsjade, linkTag:tag}
	  		)
		}else{
			console.log("not found tag:"+tag)
			res.render('empty', { title : 'Home', names : files, folders : directories, tags:tagsjade, selTags:selTagsjade, linkTag:tag})
		}
	   callback()
     }
     processFiles(function(err,fileName){
      console.log("processFiles")
     })    
    }
    else{
    console.log("getFOLDERS: ")
    var folderTemp=[]
     var directories=getDirs('./images')
     var selDirectory=directories[folder]
     var files=fs.readdirSync('./images/'+selDirectory+'/thumbs/').filter(function(v){return v[0]!='.'})
     for (var i=0;i<files.length;){
      files[i]='/images/'+selDirectory+'/thumbs/'+files[i]
      i=i+1
      folderTemp.push(folder)
     }
     res.render('index',
      { title : 'Home', names : files, dir : folderTemp, folders : directories, selFolder : selDirectory, tags:tagsjade, selTags:selTagsjade, linkTag:tag}
     )
    }
  });
})
app.get('/image', function (req, res) {
  var mirror = req.query.mirror
  var folder = req.query.folder
  var imageold = req.query.img
  var n=imageold.indexOf("/thumbs/")
  image=imageold.substr(n+8)
  tag = req.query.tag
  var del = req.query.del
  if (del){
  	var directories=getDirs('./images')
  	var direkt=directories[folder]
    var files=fs.readdirSync('./images/'+direkt+'/thumbs/').filter(function(v){return v[0]!='.'})
     for (var i=0;i<files.length;){
      files[i]='/images/'+direkt+'/thumbs/'+files[i]
      if (files[i]==imageold){imagenr=i}
      i=i+1
     }
	readJSONFile("./public/tags.json", function (err, json) {
	   if(err) { throw err; }
		var j=0
		json.tags.forEach(function processF(getTags){
		 if(getTags.name==del){
		 	var i=0
			json.tags[j].members.forEach(function ProcessM(getMember){
				if(getMember.image==imagenr && getMember.folder==folder){
					json.tags[j].members.splice(i,1)
				}
				i=i+1
			});
		 }
		 j=j+1
		})
		json=JSON.stringify(json)
		fs.writeFile("./public/tags.json", json, function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log("The file was saved!");
			}
		}); 
		if (tag==0){res.redirect('/?folder='+folder)}
		else{res.redirect('/?tag='+tag)}
	})	  
  }
  if (!tag){tag="0"}
   var tagArray = tag.split(',')
   if (req.query.sub){
    var delTag=tagArray.indexOf(req.query.sub);
    if (delTag>-1){tagArray.splice(delTag,1)}
    tag=tag.replace(','+req.query.sub,'')
   }
   var selTagsjade = []
   for (var i = 0; i<tagArray.length;) {
    selTagsjade.push({tagssel:tagArray[i]});
     i = i+1;
   }
   if (req.query.add){
    selTagsjade.push({tagssel:req.query.add});
    tag=tag+','+req.query.add
   }
   var tagArrayNew=tag.split(',')
  readJSONFile("./public/tags.json", function (err, json) {
    if(err) { throw err; }
    var tagsjade = []
    for (var i = 0; i<json.tags.length;) {
	 tagsjade.push({tagsname:json.tags[i].name});
	i = i+1;
    }
  if (!folder || folder==''){folder=0}
  var directories=getDirs('./images')
  var selDirectory=directories[folder]
  if(mirror){
   console.log("mirror NOW")
   var writeimage="/images/"+selDirectory+"/"+image
   gm(writeimage).flop().write("/images/"+selDirectory+"/flop.jpg", function (err) {
    if (!err) {console.log('done1')}else{console.log(err)};
   })
   var writethumb="/images/"+selDirectory+"/thumbs/"+image
   gm(writethumb).flop().write(writethumb, function (err) {
    if (!err) {console.log('done2')}else{console.log('error2: '+"/images/"+selDirectory+"/thumbs/"+image)};
   })
  }
  res.render('image',
  { title : 'image', name : image, dir : folder, folders : directories, selFolder : selDirectory, tags:tagsjade, selTags:selTagsjade, linkTag:tag, imagebool:1, item:imageold, foldernr:folder}
  )
 })
})
app.get('/drop', function (req, res) {
  var droptag = req.query.tag
  var dropfolder = req.query.folder
  var dropimage = req.query.image
  console.log("tag:"+droptag+" folder: "+dropfolder+" image: "+dropimage)
  if (droptag&&dropfolder&&dropimage){
  	var directories=getDirs('./images')
  	console.log("Index: "+directories.indexOf(dropfolder))
  	var getDir=directories.indexOf(dropfolder)
	readJSONFile("./public/tags.json", function (err, json) {
	   if(err) { throw err; }
		var j=0
		json.tags.forEach(function processF(getTags){
		 if(getTags.name==droptag){
			json.tags[j].members.push({"folder":getDir,"image":parseInt(dropimage)}); 
		 }
		 j=j+1
		})
		json=JSON.stringify(json)
		fs.writeFile("./public/tags.json", json, function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log("The file was saved!");
			}
		}); 
		if (tag==0){res.redirect('/?folder='+folder)}
		else{res.redirect('/?tag='+tag)}
	})
  }
})
app.post('/newtag', function (req,res){
	var newtag = req.body.sendtag
	if (newtag){
		readJSONFile("./public/tags.json", function (err, json) {
			if(err) { throw err; }
			json['tags'].push({"name":newtag,"members":[]});
			json=JSON.stringify(json)
			fs.writeFile("./public/tags.json", json, function(err) {
				if(err) {
					console.log(err);
				} else {
					console.log("The file was saved!");
				}
			}); 
			if (tag==0){res.redirect('/?folder='+folder)}
			else{res.redirect('/?tag='+tag)}
		})
	}		
})
app.listen(3000)