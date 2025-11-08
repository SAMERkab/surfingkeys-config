
console.log("surfingkeys api:", api);
var nextLinkWords = ["next", "newer", "weiter", "nächste.?",];
var nextLinkSymbols = [">", "›", "→", "»", "≫",];
var prevLinkWords = ["prev(ious)?", "back", "older", "zurück", "vorherige.?"];
var prevLinkSymbols = ["<", "‹", "←", "«", "≪",];
var oneWholeWord = (words) => `(\\b(${words.join("|")})\\b)`;
var symbolsOnly = (symbols) => `(^(\\s*(${symbols.join("|")})\\s*)+$)`;
var symbolsAndWords = (words, symbols) => `(\\s*${oneWholeWord(words)}|(${symbols.join("|")})\\s*)*`;
var symbolsAndAtLeastOneWord = 
    (words, symbols) => symbolsAndWords(words, symbols) + oneWholeWord(words) + symbolsAndWords(words, symbols);

// Settings as described at https://github.com/brookhong/Surfingkeys?tab=readme-ov-file#edit-your-own-settings
settings.nextLinkRegex = new RegExp(
    symbolsAndAtLeastOneWord(nextLinkWords, nextLinkSymbols) +
    "|" +
    symbolsOnly(nextLinkSymbols),
    "i"
);
settings.prevLinkRegex = new RegExp(
    symbolsAndAtLeastOneWord(prevLinkWords, prevLinkSymbols) +
    "|" +
    symbolsOnly(prevLinkSymbols),
    "i"
);
// settings.nextLinkRegex = /(^\s*()+\s*$)/i;
settings.pageUrlRegex = [new RegExp('(.*://.*?/.*?)(\\d+)(?!.*\\d)(.*?)')]  // this is used to extract a number from the url to increase/decrease when the next/prev link regex has zero matches.
settings.modeAfterYank = "Normal";
settings.interceptedErrors = ['*'];
settings.enableEmojiInsertion = true;
// settings.cursorAtEndOfInput = false;

settings.defaultLLMProvider = "ollama";
settings.llm = {
//    bedrock: {
//        accessKeyId: '********************',
//        secretAccessKey: '****************************************',
//        // model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
//        model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
//    },
//    gemini: {
//        apiKey: '***************************************',
//    },
    ollama: {
        model: 'qwen2.5-coder:32b',
    },
//    deepseek: {
//        apiKey: '***********************************',
//        model: 'deepseek-chat',
//    },
//    custom: {
//        serviceUrl: 'https://api.siliconflow.cn/v1/chat/completions',
//        apiKey: '***********************************',
//        model: 'deepseek-ai/DeepSeek-V3.1',
//    }
}

api.Front.registerInlineQuery({
    url: function(q) {
        console.log('requesting', q);
        const url = `https://www.merriam-webster.com/dictionary/${q}`;
        return url;
    },
    parseResult: function(res) {
        console.log('res:', res);
        const parser = new DOMParser();
        const pageContent = parser.parseFromString(res.text, "text/html");
        console.log(pageContent);
        return pageContent.querySelector(".vg").outerHTML;
    }
});


/********** map ************/
const leader = ',';

api.map("``", '<Ctrl-6>');
api.map("g<Tab>", '<Ctrl-6>');

api.mapkey('oa', 'Open URL in the Internet Archive', function() {
    api.tabOpenLink(`https://web.archive.org/web/*/${window.location.href}`);
});


/********** remap ************/
api.map('<Ctrl-o>', 'S'); api.unmap('S');
api.map('<Ctrl-i>', 'D'); api.unmap('D');
api.map("gt", 'R'); api.unmap('R');
api.map("gT", 'E'); api.unmap('E');

//remap(']]', 'Click on the next link on current page', function(originalBehaviour) {
//    alert('You are about to go to the next page');
//    originalBehaviour();
//})
//remap('[[', 'Click on the previous link on current page', function(originalBehaviour) {
//    alert('You are about to go to the previous page');
//    originalBehaviour();
//})

remap('m', 'Add current URL to vim-like mark', async function(originalBehaviour, mark) {
    let url, specificUrl;
    url = specificUrl = window.location.href;
    
    if (pageHasVideo()) {
        let videoElement = document.querySelector("video");
        specificUrl = addVideoTimeToUrl(url, Math.floor(videoElement.currentTime));
    }
    
    let markObject = {};
    markObject[mark] = {
        url, specificUrl,
        scrollLeft: document.scrollingElement.scrollLeft,
        scrollTop: document.scrollingElement.scrollTop
    };
    
    api.RUNTIME('addVIMark', {mark: markObject});
    api.Front.showBanner("Mark '{0}' added for: {1}.".format(mark, specificUrl));
});

remap("'", 'Jump to vim-like mark', function(originalBehaviour, mark) {
    if (mark == "'") {
        api.RUNTIME("goToLastTab");
    } else {
        originalBehaviour(mark);
    }
});

// TODO: check if the target website is already open in some tab.
// TODO: set the currentTime property instead of adding the time to the video url (benefit: any video website is supported)
api.mapkey("`", 'Jump to vim-like mark and last video playback time', function(mark) {
    api.RUNTIME('getSettings', {key: "marks"}, function(response) {
        api.tabOpenLink(response.settings.marks[mark].specificUrl);
    });
});


/********** unmap ************/
// proxy stuff
api.unmap(';pa');
api.unmap(';pb');
api.unmap(';pd');
api.unmap(';ps');
api.unmap(';pc');
api.unmap('cp');
api.unmap(';cp');
api.unmap(';ap');


api.removeSearchAlias('w', 's');


/*********** Site specific overrides *************/

if (window.location.origin == "https://shamela.ws") {
    settings.nextLinkRegex = /^\s*<\s*$/;
    settings.prevLinkRegex = /^\s*>\s*$/;
    //settings.nextLinkRegex = /التالي/;
    //settings.prevLinkRegex = /التالي/;
    //settings.smartPageBoundary = true;
}
// if ( window.location.origin  === "https://www.google.com" ) {
//     settings.smartPageBoundary = true;
// }

/********** functions ************/
function remap(existingKey, description, newBehaviour) {
    api.map('_'+existingKey, existingKey);
    api.unmap(existingKey);
    function oldBehaviour(additionalKeys) {
        api.Normal.feedkeys('_'+existingKey+additionalKeys);
    }
    if (newBehaviour.length <= 1) {
        api.mapkey(existingKey, description, function() {
            newBehaviour(oldBehaviour);
        });
    } else {
        api.mapkey(existingKey, description, function(mark) {
            newBehaviour(oldBehaviour, mark);
        });
    }
}

// TODO: support more video viewing websites
async function pageHasVideo() {
    return window.location.href.includes('watch');
}

function addVideoTimeToUrl(url, time) {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set("t", time);
  return parsedUrl.href;
}
    // TODO: delete this:
    //const MAX_TIME_TO_FIND_VIDEO = 7000;
    //const FIND_VIDEO_INTERVAL = 300;
    //let videoElement;
    //let ellapsedTime = -FIND_VIDEO_INTERVAL;
    //return new Promise((resolve, reject) => {
    //    function searchForVideo() {
    //        ellapsedTime += FIND_VIDEO_INTERVAL;
    //        videoElement = document.querySelector("video");
    //        if (videoElement) {
    //            resolve(videoElement);
    //        } else if (ellapsedTime < MAX_TIME_TO_FIND_VIDEO) {
    //            setTimeout(searchForVideo, FIND_VIDEO_INTERVAL);
    //        } else {
    //            resolve(null);
    //        }
    //    };
    //    searchForVideo();
    //});
    //setTimeout(async function () {
    //    const video = await pageHasVideo();
    //    if (video) {
    //        const storedTime = parseInt(localStorage.getItem(`surfingkeys.marks.${mark}.videoTime`));
    //        if (storedTime) {
    //            video.currentTime = storedTime;
    //        }
    //    }
    //}, 1);

// Fix src/content_scripts/common/hints>createHints>walkPageUrl not deserializing the pageUrlRegex option.
const originalMatch = String.prototype.match;
String.prototype.match = function(obj) {
    let regex = obj;
    if (obj && obj.source && !(obj instanceof RegExp)) {
        regex = new RegExp(obj.source, obj.flags);
    }
    return originalMatch.call(this, regex);
}

/********** theme ************/
// settings.theme = `
// .sk_theme {
//     font-family: Input Sans Condensed, Charcoal, sans-serif;
//     font-size: 10pt;
//     background: #24272e;
//     color: #abb2bf;
// }
// .sk_theme tbody {
//     color: #fff;
// }
// .sk_theme input {
//     color: #d0d0d0;
// }
// .sk_theme .url {
//     color: #61afef;
// }
// .sk_theme .annotation {
//     color: #56b6c2;
// }
// .sk_theme .omnibar_highlight {
//     color: #528bff;
// }
// .sk_theme .omnibar_timestamp {
//     color: #e5c07b;
// }
// .sk_theme .omnibar_visitcount {
//     color: #98c379;
// }
// .sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) {
//     background: #303030;
// }
// .sk_theme #sk_omnibarSearchResult ul li.focused {
//     background: #3e4452;
// }
// #sk_status, #sk_find {
//     font-size: 20pt;
// }`;

/* ideas:
 - next/back: If multiple buttons are found, enter hint mode and remember which
   button the user chooses. On next invocation, click that button directly.
   Introduce multiple levels of regex searches instead of a single regex, i. e.
   if the first regex doesn't find any buttons, then, and only then, go to the 
   next regex and try again with that.
 - visit brave://settings/system/shortcuts and remap native shortcuts to their
   vim equivalents where ever sensible.
 - map ` to ' only one time instead for doing a mapping for each letter. E. g.
   after the user types `, listen for a keydown event.
 - find a way to hide the remapped keys (those beginning with _) from the help
   screen. Tip: copy the behaviour of ? from the source code and make it display
   the remapped commands in their original positions instead of under 'misc'.

*/

