'use strict';

var vetala = (function() {

const state = {
    editor: null,
    filename: null,
    xmlDoc: null,
    xmlTxt: null,
    xml_div: null,
    xml_folio: null,
    prevcontents: null,
    pblocations: null,
    view: 'folio',
    script: 'iast',
}

const _metres = new Map([
        ['anuṣṭubh', [16,16]],
        ['śārdūlavikrīḍita',[19,19,19,19]],
        ['indravajrā',[11,11,11,11]],
        ['vaṃśastha',[12,12,12,12]],
]);

const init = function() {

    document.getElementById('file').addEventListener('change',file.select,false);
    //document.getElementById('newfile').addEventListener('click',file.startnew);
    //scriptselect = document.getElementById('scriptselect')
    //scriptselect.value = 'iast';
    //scriptselect.addEventListener('change',scriptSelect);
    document.body.addEventListener('copy',removeHyphens);
}

const file = {
    select: function(e) {
        const f = e.target.files[0];
        state.filename = f.name;
        const reader = new FileReader();
        reader.onload = file.displaytarget;
        reader.readAsText(f);
    },

    displaytarget: function(e) {
        file.display(e.target.result);
    },

    display: function(str) {
      state.xmlDoc = parseXMLString(str);
      displayXML(state.xmlDoc);
      document.body.addEventListener('click',bodyClick);
      document.getElementById('topmenu').addEventListener('mouseover',menu.mouseover);
      document.getElementById('topmenu').addEventListener('mouseout',menu.mouseout);
      document.getElementById('scriptselect').addEventListener('click',menu.scriptSelect);
      document.getElementById('menu_width').addEventListener('change',menu.widthChange);
      const menu_options = document.getElementById('options_options').querySelectorAll('input[type="checkbox"]');
      for(const option of menu_options) {
          option.checked = true;
          option.addEventListener('change',menu.showHide);
      }
    },

    startnew: function() {
        state.filename = 'new.xml';
        file.display({target: {result: tei_template}});
    /*
        const xmlDoc = parseXMLString(tei_template);
        state.xmlDoc = xmlDoc;
        displayXML(state.xmlDoc);
        document.body.addEventListener('click',bodyClick);
    */
        headerEditor.init();
    },
}

const parseXMLString = function(file) {
    const xmlParser = new DOMParser();
    const newXmlDoc = xmlParser.parseFromString(file,'text/xml');
    if(newXmlDoc.documentElement.nodeName == 'parsererror')
        alert('XML errors!');
    else
        return newXmlDoc;

}

const bodyClick = function(e) {
    const classes = e.target.classList;
/*    
    if(e.target.id === 'headeredit')
        headerEditor.init();

    else if(classes.contains('editbutton'))
        (state.view === 'folio') ?
            initEditor(e.target.dataset.n) :
            initEditorDiv(e.target.closest('div'));

    else if(classes.contains('viaf_search'))
        headerEditor.viafSearch(e.target);
    
    else if(classes.contains('pancanga'))
        headerEditor.pancangaSearch();

    else if(e.target.id === 'updateheader')
        headerEditor.update();

    else if(e.target.id === 'cancelheader')
        HeaderEditor.destroy();

    else if(e.target.id === 'cancelbutton')
        destroyEditor();

    else if(e.target.id === 'updatebutton')
        (state.view === 'folio') ?
            saveEdit() :
            saveEditDiv();

    else if(e.target.id === 'appendbutton')
        appendFolio();

    else if(e.target.id === 'saveasbutton')
        saveAs();
    else */if(e.target.id === 'storyview')
        changeView();
    
    else if(e.target.id === 'savetextbutton')
        saveText();
}

const removeHyphens = function(ev) {
    //if(ev.target.nodeType != '3') return;
    ev.preventDefault();
    var sel = window.getSelection().toString();
    sel = sel.replace(/\u00AD/g,'');
    (ev.clipboardData || window.clipboardData).setData('Text',sel);
}

const bodyMouseUp = function(e) {
    const sel = window.getSelection();
    if(sel.isCollapsed) return false;
    
    const selrange = sel.getRangeAt(0);
   
    const parel = selrange.commonAncestorContainer.nodeType === 1 ?
                    selrange.commonAncestorContainer :
                    selrange.commonAncestorContainer.parentElement;
    if(parel && 
        (parel.closest('.pb') || 
         parel.closest('.fw') ||
         parel.closest('.lb') ||
         parel.closest('.lb-minimal') ||
         parel.closest('h3.story') ||
         parel.closest('span.story'))
        )
        return false;

    const seltext = selrange.toString().trim();
    if(/\s/.test(seltext)) tooltip.phrase(e,seltext);

    else tooltip.word(e,seltext);
}

const tooltip = {
    word: function(e, txt) {
        const tipbox = tooltip.init(e);
        const query = tooltip.clean(
                        Sanscript.t(txt,state.script,'velthuis')
                      );
        const url = 'http://sanskrit.inria.fr/cgi-bin/SKT/sktindex?lex=MW&q='+query+'&t=VH';
        tooltip.link(url,'lookup in Monier-Williams',tipbox);

        tooltip.phraselink(query,tipbox);

        tooltip.insert(tipbox);
    },
    link: function(url,txt,tipbox) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = txt;
        link.target = '_blank';
        tipbox.appendChild(link);
    },
    phrase: function(e, txt) {
        const tipbox = tooltip.init(e);
        const phrase = state.script !== 'iast' ?
            Sanscript.t(txt,state.script,'iast') :
            txt;

        const cleaned = tooltip.clean(to.smush(phrase,''));
        tooltip.phraselink(cleaned,tipbox);
        tooltip.insert(tipbox);
    },
    phraselink: function(txt,tipbox) {
        const query = Sanscript.t(txt,'iast','velthuis').replace(/\s+/g,'+');
        
        const url = 'http://sanskrit.inria.fr/cgi-bin/SKT/sktgraph?lex=MW&st=t&us=f&cp=t&text='+query+'&t=VH&topic=&mode=g&corpmode=&corpdir=&sentno=';

        tooltip.link(url,'parse with Sanskrit Heritage engine',tipbox);
    },
    clean: function(txt) {
        return txt.replace(/[\d\|\u00AD⸤]/gu,'')
                  .replace(/rmm/g,'rm')
                  .replace(/rtth/g,'rth')
                  .replace(/ṃ$/,'m')
                  .replace(/o$/,'aḥ');
    },
    init: function(e) {
        tooltip.remove();
        const tipbox = document.createElement('div');
        tipbox.id = 'tooltip';
        tipbox.style.top = (e.clientY + 10) + 'px';
        tipbox.style.left = e.clientX + 'px';
        tipbox.style.opacity = 0;
        tipbox.style.transition = 'opacity 0.2s ease-in';
        
        return tipbox;
    },
    insert: function(tipbox) {
        const par = document.getElementById('teibody');
        par.parentNode.insertBefore(tipbox,par);

        window.getComputedStyle(tipbox).opacity;
        tipbox.style.opacity = 1;

        par.addEventListener('mousedown',tooltip.remove);
    },
    remove: function() {
        const oldtip = document.getElementById('tooltip');
        if(oldtip) oldtip.parentElement.removeChild(oldtip);
        document.getElementById('teibody').removeEventListener('mousedown',tooltip.remove);
    }
}

const changeView = function() {
    const middle = viewPos.findPageMiddle();

    switch (state.view) {
        case 'folio':
           state.view = 'story';
           document.getElementById('menu_lb').checked = false;
           document.getElementById('menu_pb').checked = false;
           break;

        default:
            state.view = 'folio';
            document.getElementById('menu_lb').checked = true;
            document.getElementById('menu_pb').checked = true;
    }
    render.menu();
    render.body(state.xmlDoc);
    render.options();
    render.TOC();
    viewPos.set(middle);
}

const XSLTransform = function(xslsheet,node,params = {}) {
    const xslt_processor = new XSLTProcessor();
    for (const [key,val] of Object.entries(params))
        xslt_processor.setParameter(null,key,val);
    xslt_processor.importStylesheet(xslsheet);

    return xslt_processor.transformToFragment(node,document);
}

const displayXML = function(xmlDoc) {

    // Render top row of buttons

    render.menu();

    // Render TEI header
    
    render.header(xmlDoc);

    // Render TEI body text
    
    render.body(xmlDoc);

    // Split the body text into folios
    
    state.xmlTxt = xmlDoc.documentElement.outerHTML;
    splitSections(state.xmlTxt);

    // Render table of contents
    
    render.TOC();
}


const splitSections = function(xmlTxt) {
    const regex = RegExp('<pb\\s+n=[\'"](\\w+)[\'"].*\/>','g');
    var pblocations = [];
    var results;
    while( (results = regex.exec(xmlTxt)) !== null) {
        pblocations.push({n: results[1], loc: results.index});
    }
    
    pblocations.push({n: null, loc: xmlTxt.indexOf('</body>')});

    state.pblocations = pblocations;
}

const render = {
    menu: function() {
        const topbuttons = document.getElementById('topbuttons');
        const storytxt = (state.view === 'story') ? 'view as folios' : 'view as running text';

        topbuttons.querySelector('#storyview').innerHTML = storytxt;
        topbuttons.style.display = 'block';

    },

    TOC: function() {
        const contents_menu = document.getElementById('contents_menu');
        const contents_options = document.getElementById('contents_options');
        while(contents_options.firstChild) 
            contents_options.removeChild(contents_options.firstChild);

        const pb = document.querySelector('h3.pb');
        const stories = document.querySelectorAll('h3.story');
        if(pb) {
            const hrs = document.querySelectorAll('hr');
            for(const hr of hrs) {
              if(hr.dataset.n === '_last' || hr.dataset.n === '_first')
                  continue;
              const new_li = document.createElement("li"); 
              const new_a = document.createElement("a");
              new_a.setAttribute("href","#"+hr.id);
              new_a.appendChild(document.createTextNode('folio ' + hr.dataset.n));
              new_li.appendChild(new_a);
              contents_options.appendChild(new_li);
            }
        contents_menu.style.display = 'inline-block';
        }
        else if(stories.length > 0) {
            const hrs = document.querySelectorAll('hr');
            for(const hr of hrs) {
              if(hr.dataset.n === '_last' || hr.dataset.n === '_first')
                  continue;
              const new_li = document.createElement("li"); 
              const new_a = document.createElement("a");
              new_a.setAttribute("href","#"+hr.id);
              new_a.appendChild(document.createTextNode('story ' + hr.dataset.n));
              new_li.appendChild(new_a);
              contents_options.appendChild(new_li);
            }
        contents_menu.style.display = 'inline-block';
            }
        else {
            contents_menu.style.display = 'none';
        }
    },

    header: function(xmlDoc) {
        const teiheader = document.getElementById('teiheader');
        const headerfragment = XSLTransform(
                document.getElementById('tei_header_style').contentDocument,
                xmlDoc.getElementsByTagName('teiHeader')[0]
        );
        
        teiheader.innerHTML = '';
        teiheader.appendChild(headerfragment);
        
    },
    
    body: function(xmlDoc) {
        const HTMLbody = document.getElementById('teibody');
        const XMLbody = xmlDoc.getElementsByTagName('body')[0];

        HTMLbody.innerHTML = '';

        if(state.view === 'story') 
            render.story(HTMLbody,XMLbody);
        else
            render.folios(HTMLbody,XMLbody);

        if(state.script !== 'iast') {
            let teibody = document.getElementById('teibody');
            teibody.parentElement.replaceChild(
                changeScript(teibody,state.script),
                teibody);
        }
        tooltip.remove();
        teibody.addEventListener('mouseup',bodyMouseUp);
    },

    folios: function(HTMLbody,XMLbody) {
        const bodyXSLT = document.getElementById('tei_body_style').contentDocument;
        const bodyfragment = XSLTransform(bodyXSLT,XMLbody);

        HTMLbody.style.paddingLeft = '0';
        HTMLbody.style.paddingRight = '0';
        HTMLbody.style.textAlign = 'left';
        HTMLbody.appendChild(bodyfragment);
/*
        const lasthr = document.createElement('hr');
        lasthr.setAttribute('data-n','_last');
        const appendform = document.createRange().createContextualFragment(
    `<form id = "appendform" lang="en" class="buttoncontainer row">
    <button type="button" id="appendbutton">new folio</button>
    </form> `);
        HTMLbody.appendChild(lasthr);
        HTMLbody.appendChild(appendform);
*/
    },

    story: function(HTMLbody,XMLbody) {
        const bodyXSLT = document.getElementById('tei_body_style_divs').contentDocument;
        const bodyfragment = XSLTransform(bodyXSLT,XMLbody);

        const firsthr = document.createElement('hr');
        firsthr.setAttribute('data-n','_first');
        firsthr.style.marginLeft = '-80px';
        firsthr.style.width = 'calc(100% + 160px)';
        HTMLbody.appendChild(firsthr);
        
        HTMLbody.style.paddingLeft = '80px';
        HTMLbody.style.paddingRight = '80px';
        HTMLbody.style.textAlign = 'justify';
        HTMLbody.appendChild(prettyVerses(prettyPrint(bodyfragment)));
    },

    options: function() {
        const menu_del = document.getElementById('menu_deleted');
        const menu_add = document.getElementById('menu_added');
        const menu_lb = document.getElementById('menu_lb');
        const menu_pb = document.getElementById('menu_pb');
        for(const item of [menu_del,menu_add,menu_lb,menu_pb]) {
            if(!item.checked)
                menu.showHide({target: item});
        }
    },
}

const saveText = function() {
    const params = {'del' : document.getElementById('menu_deleted').checked,
                  'add' : document.getElementById('menu_added').checked,
                  'lb' : document.getElementById('menu_lb').checked,
                  'pb' : document.getElementById('menu_pb').checked,
                  'fw' : false};
    const cleanbody = state.xmlDoc.getElementsByTagName('body')[0].cloneNode(true);
    for(const [key,val] of Object.entries(params)) {
        if(val === false) {
            for(const el of cleanbody.querySelectorAll(key))
                el.parentNode.removeChild(el);
        }
    }
    const XMLbody = (state.script === 'iast') ?
        prettyPrint(cleanbody,true) :
        prettyPrint(
            changeScript(cleanbody,state.script),
            true);
    const plainXSLT = document.getElementById('tei_body_style_plain').contentDocument;
    const frag = XSLTransform(plainXSLT,XMLbody);
    const dummy = document.createElement('div');
    dummy.appendChild(frag)
    const plain = dummy.innerHTML;
    const file = new Blob([plain], {type: 'text/plain;charset=utf-8'});
    const fileURL = state.filename.replace(/\.xml$/,'.txt'); // change extension 
    FileSaver(file,fileURL);
}

const saveAs = function() {
    const file = new Blob([state.xmlTxt], {type: 'text/xml;charset=utf-8'});
    //const fileURL = URL.createObjectURL(file);
    const fileURL = state.filename; 
    FileSaver(file,fileURL);
   /* const anchor = document.createElement('a');
    anchor.href = fileURL;anchor.target = '_blank';
    anchor.download = state.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    */
}
/*
const getSchema = function() {
    const custom = ['storyStart','storyEnd','verseStart','verseEnd','frameStart','frameEnd'];
    const layout = ['pb','lb','fw','space']; // no divs anymore
    const emendations = ['add','del','subst'];
    const difficult = ['unclear','damage'];

    const tags = {
        "!top": [...layout, ...emendations, ...difficult, ...custom],
        "!attrs": {
        },

        // Text division & Page layout
        pb: {
            attrs: {
                n: null,
                facs: null,
                '/': null,
            }
        },
        lb: {
            attrs: {
                n: null,
                '/': null,
            }
        },
        fw: {
            attrs: {
                type: ['pageNum', 'header', 'footer'],
                place: ['above','below','left','right','top','bottom','margin'],
            },
            children: [...layout, ...emendations],
        },
                space: {
            attrs: {
                quantity: null,
                rend: ['overline','dash'],
                '/': null,
            }
        },

        // Text emendations

        add: {
            attrs: {
                rend: ['caret','above','below'],
                place: ['above','below','left','right','top','bottom','margin'],
            },
            children: [...emendations, ...difficult],
        },
        del: {
            attrs: {
                rend: ['overstrike','understrike','strikethrough','scribble'],
            },
            children: [...emendations, ...difficult],
        },
        subst: {
            attrs: {
                type: ['transpose'],
            },
            children: ['add','del'],
        },

        // Difficult or missing text
        unclear: {
            attrs: {
                reason: ['blemish','rubbed','messy'],
            }
        },
        damage: {
            attrs: {
                reason: ['torn','hole'],
                quantity: null,
            },
        },

        storyStart: {
            attrs: {
                n: null,
                '/>': null,
            },
        },
        storyEnd: {
            attrs: {
                '/>': null,
            },
        },
        verseStart: {
            attrs: {
                n: null,
                '/>': null,
            },
        },
        verseEnd: {
            attrs: {
                '/>': null,
            },
        },
        frameStart: {
            attrs: {
                n: null,
                '/>': null,
            },
        },
        frameEnd: {
            attrs: {
                '/>': null,
            },
        },
    };

    return tags;
}
*/

const prettyVerses = function(frag) {
    const verses = frag.querySelectorAll('[data-metre]');
    for(const verse of verses) {
        const metre = _metres.get(verse.dataset.metre);
        if(metre) {
            verse.parentNode.replaceChild(versify(verse,metre), verse);
        }
    }
    return frag;
}

const versify = function(verse,metre) {
    const node = verse.cloneNode(true);
    var cur = 0;
    var targ = 0;
    const rgx = /^[kgcjṭḍtdpbṅñṇnmyrŕlḻvśṣsh](?=\s|$)/;
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
        const txtnode = walker.currentNode;
        const aksaras = aksaraSplit(txtnode.data);
        if(cur +  aksaras.length >= metre[targ]) {
            const aksara_pos = metre[targ] - cur;
            if(aksaras.length > aksara_pos) {
                const nxt = aksaras[aksara_pos];
                if(nxt.match(rgx)) {
                    const break_pos = nxt.search(/\|(?=[^|]*$)/) + 1;
                    aksaras[aksara_pos-1] = aksaras[aksara_pos-1] + nxt.slice(0,break_pos);
                    aksaras[aksara_pos] = nxt.slice(break_pos);
                }
            }
            const cur_pos = aksaras.slice(0,aksara_pos).join('').length;
            const repl = txtnode.splitText(cur_pos);
            const br = document.createElement('br');
            repl.parentNode.insertBefore(br,repl);
            cur = 0;
            targ++;
            //if(targ === metre.length-1) return node;
            if(targ === metre.length-1) break;
        }
        else cur = cur + aksaras.length;
    }
    const elwalker = document.createTreeWalker(node,NodeFilter.SHOW_ELEMENT);
    while(elwalker.nextNode()) {
        const elnode = elwalker.currentNode;
        if(elnode.tagName === 'DIV' && elnode.hasAttribute('data-metre')) {
            const metre = _metres.get(verse.dataset.metre);
            if(metre)
                elnode.parentNode.replaceChild(versify(elnode,metre),elnode);
        }
    }
    return node;
//    return node;
}

const aksaraSplit = function(str) {
    const chars = str.split('');
    var aksaras = [''];
    var had_vowel = false;
    var vowel_end = false;
    //var was_other = false;
    const vowels = 'aāiīíeéuúūoóṛṝḷṃṁḥ'.split('');
    const consonants = 'kgcjṭḍtdpbṅñṇnmyrŕlḻvśṣsh'.split('');

    for(const ch of chars) {
        if(vowels.indexOf(ch) !== -1) {
            if(had_vowel && !vowel_end)
                aksaras.push(ch);
            else
                aksaras.push(aksaras.pop() + ch);
            had_vowel = true;
            vowel_end = true;
            //was_other = false;
        }
        else {
            if(had_vowel && consonants.indexOf(ch) !== -1) {
                aksaras.push(ch);
                had_vowel = false;
            }
            else aksaras.push(aksaras.pop() + ch);
            vowel_end = false;
        }
    }
    return aksaras;
}

const prettyPrint = function(el,no_nbsp) {
    const node = el.cloneNode(true);
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
        let data = walker.currentNode.data;
        if(/^\s+$/.test(data)) {
            walker.currentNode.data = '';
            continue;
        }
        data = data.replace(/^[\s\uFEFF\xA0]*-/g,'');
        //data = data.replace(/^[\s\uFEFF\xA0-]+/g,'');
        let rtrim = data.replace(/[\s\uFEFF\xA0]+$/g,'');
        if(rtrim.slice(-1) === '-')
            data = rtrim.slice(0,-1);
        else if(rtrim.slice(-2) === '-\\')
            data = rtrim.slice(0,-2) + '\\';
        if(!no_nbsp) {
            data = data.replace(/[\s\uFEFF]+(?=\|)/g,'\xA0');
            data = data.replace(/\|\s+(?=\d+)/g,'|\xA0');
        } 
        else { // remove line breaks
            data = data.replace(/^[\s\n\t\f]+/,' ');
            data = data.replace(/[\s\n\t\f]+$/,' ');
            data = data.replace(/[\s\n\t\f]{2,}/,' ');
        }
        if(walker.currentNode.parentNode === node ||
           walker.currentNode.parentNode.classList.contains('verse') ||
           walker.currentNode.parentNode.classList.contains('story') ||
           walker.currentNode.parentNode.classList.contains('fw')) {
            data = window['Hypher']['languages']['sa'].hyphenateText(data);
        }
        walker.currentNode.data = data;
    }
    return node;
}

const changeScript = function(orignode,script,placeholder = false,cur_lang="sa") {
    const func = to[script];
    const node = orignode.cloneNode(true);
    var cur_lang;

    
    function loop(node,cur_lang) { 
        let kids = node.childNodes;

        for(let kid of kids) {
            
            if(kid.nodeType === 8) continue;

            if(kid.nodeType === 3) {
                if(cur_lang !== 'sa')
                    continue;
                else
                    kid.data = func(kid.data,placeholder);
            }
            else if(kid.hasChildNodes()) {
                let kidlang = kid.getAttribute('lang') || cur_lang;
                if(kidlang === 'sa' && kid.classList.contains('subst'))
                    jiggle(kid,script);
                loop(kid,kidlang);
            }
        }
    } //end function loop

    loop(node,cur_lang);
    return node;
}

const jiggle = function(node,script) {
    if(node.firstChild.nodeType !== 3 && node.lastChild.nodeType !== 3) 
        return;

    const kids = node.childNodes;
    //const vowels = ['ā','i','ī','u','ū','e','ê','o','ô','ṃ','ḥ','ai','au','aî','aû'];
//    const vowels_regex = /[aāiīuūeoṛṝḷṃḥ_]$/;
    const starts_with_vowel = /^[aāiīuūeêoôṛṝḷṃḥ]/;
    const ends_with_consonant = /[kgṅcjñṭḍṇtdnpbmyrlvṣśsh]$/;

    const telugu_vowels = ['ā','i','ī','e','o','_','ai','au'];
    const telu_cons_headstroke = ['h','k','ś','y','g','gh','c','ch','jh','ṭh','ḍ','ḍh','t','th','d','dh','n','p','ph','bh','m','r','ḻ','v','ṣ','s'];
    var telugu_del_headstroke = false;
    var telugu_kids = [];
    //const initial_vowels_allowed = (kids[0].nodeType !== 3) ? true : false;
    var add_at_beginning = [];
    const starts_with_text = (kids[0].nodeType === 3);
//    const ends_with_text = (kids[kids.length-1].nodeType === 3);

    for (let kid of kids) {
        if(kid.nodeType > 3) continue;

        const txt = kid.textContent.trim();
        if(txt === '') continue;
        if(txt === 'a') { 
            kid.textContent = '';
            continue;
        }

        if(txt.match(ends_with_consonant)) {
        // add 'a' if node ends in a consonant
            const last_txt = findTextNode(kid,true);
            last_txt.textContent = last_txt.textContent.replace(/\s+$/,'') + 'a';
            if(script === 'telugu' &&
               telu_cons_headstroke.indexOf(txt) >= 0) {
                // console.log(kid);
                // if there's a vowel mark in the substitution, 
                // remove the headstroke from any consonants
                telugu_kids.push(kid);
            }
        }
        
        // case 1, use aalt:
        // ta<subst>d <del>ip</del><add>it</add>i</subst>
        // case 2, use aalt:
        // <subst>d <del>apy </del><add>ity </add>i</subst>va
        // case 3, no aalt:
        // <subst><del>apy </del><add>ity </add>i</subst>va
        
        // use aalt if node is a text node or 
        // if it starts with a vowel
        if(kid === node.lastChild && kid.nodeType === 3) {
            const cap = document.createElement('span');
            cap.appendChild(kid.cloneNode(false));
            node.replaceChild(cap,kid);
            kid = cap; // redefines 'kid'
            kid.classList.add('aalt');
        }

        else if(starts_with_text && txt.match(starts_with_vowel))
            kid.classList.add('aalt');
        
        switch (script) {
            case 'devanagari':
                if(txt === 'i') 
                    add_at_beginning.unshift(kid);
                else if(txt === 'ê') {
                    kid.classList.remove('aalt');
                    kid.classList.add('cv01');
                    add_at_beginning.unshift(kid);
                }
                else if(txt === 'ô') {
                    const new_e = kid.cloneNode(true);
                    replaceTextInNode('ô','ê',new_e);
                    new_e.classList.remove('aalt');
                    new_e.classList.add('cv01');
                    add_at_beginning.unshift(new_e);
                    replaceTextInNode('ô','ā',kid);
                }
                else if(txt === 'aî') {
                    const new_e = kid.cloneNode(true);
                    replaceTextInNode('aî','ê',new_e);
                    new_e.classList.remove('aalt');
                    new_e.classList.add('cv01');
                    add_at_beginning.unshift(new_e);
                    replaceTextInNode('aî','e',kid);
                }
                else if(txt === 'aû') {
                    const new_e = kid.cloneNode(true);
                    replaceTextInNode('aû','ê',new_e);
                    new_e.classList.remove('aalt');
                    new_e.classList.add('cv01');
                    add_at_beginning.unshift(new_e);
                    replaceTextInNode('aû','o',kid);
                }
                break;
            case 'grantha':
            case 'malayalam':
                if(txt === 'e' || txt === 'ai') 
                    add_at_beginning.unshift(kid);
                else if(txt === 'o') {
                    const new_e = kid.cloneNode(true);
                    replaceTextInNode('o','e',new_e);
                    add_at_beginning.unshift(new_e);
                    replaceTextInNode('o','ā',kid);
                }
                break;
            case 'telugu':
                if(!telugu_del_headstroke &&
                   telugu_vowels.indexOf(txt) >= 0)
                    
                    telugu_del_headstroke = true;
                break;

        }
    } // end for let kid of kids

    for (const el of add_at_beginning) {
        node.insertBefore(el,node.firstChild);
    }

    if(telugu_del_headstroke) {
        for (const el of telugu_kids) {
            const lasttxtnode = findTextNode(el,true);
            lasttxtnode.textContent = lasttxtnode.textContent + '\u200D\u0C4D';
        }
    }
}

const findTextNode = function(node,last = false) {
    if(node.nodeType === 3) return node;
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null,false);
    if(!last) return walker.nextNode;
    else {
        let txt;
        while(walker.nextNode())
            txt = walker.currentNode;
        return txt;
    }
}

const replaceTextInNode = function(text, replace, node) {
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null,false);
    while(walker.nextNode()) {
        let cur_txt = walker.currentNode.textContent;
        if(cur_txt.match(text))
            walker.currentNode.textContent = replace;
    }
}

const extractHTMLFolio = function(pb_n) {

    if(pb_n === '_last') {
        let appendform = document.getElementById('appendform');
        let start = appendform.previousSibling;
        let end = appendform.nextSibling;
        return {
            prevcontents: appendform.parentNode.removeChild(appendform),
            start: start,
            end: end
        };
    }
    
    const pbs = document.getElementsByTagName('hr');
    var start;
    var end = false;
    var next_is_end = false;

    for(let pb of pbs) {
        if(next_is_end) {
            end = pb;
            break;
        }
        else if(pb.dataset.n === pb_n) {
            start = pb;
            next_is_end = true;
        }

    }
    
    const range = document.createRange();
    range.setStartAfter(start);
    if(!end) {
        let body = document.getElementsByTagName('body')[0];
        range.setEnd(body,body.childNodes.length);
    }
    else
        range.setEndBefore(end);
    return {prevcontents: range.extractContents(),start: start,end: end};
}

/*
const getNewFolio = function() {
    var new_folio;
    
    const pbs = document.querySelectorAll('h3[class="pb"]');
    if(pbs.length > 0) {
        const last_pb = pbs[pbs.length-1].textContent.trim();
        
        const rv = (last_pb.slice(-1) ===  'v') ? 'r' : 'v';
        let page_no = parseInt(last_pb);
        
        if(isNaN(page_no))
            page_no = 'X';
        else if(rv === 'r')
            page_no++;
        
        
        new_folio = '<pb n="'+page_no+rv+'" facs=""/>\n';
    }
    else
        new_folio = '<pb n="Xr" facs=""/>\n';

    new_folio +=
`  <fw type="header" place="top left"></fw>
  <fw type="pageNum" place="left margin"></fw>
  <lb n="1"/>
`;
    
    const lbs = document.querySelectorAll('span[class="lb"]');
    if(lbs) {
        const lb_n = parseInt(lbs[lbs.length-1].textContent.trim());
        for(let n=2;n<=lb_n;n++) {
            new_folio = new_folio + '  <lb n="'+n+'"/>\n';
        }
    }
    new_folio +=
`  <fw type="footer" place="bottom right"></fw>
  <fw type="pageNum" place="right margin"></fw>
`;

    return new_folio;
}
*/

const extractXMLFolio = function(pb_n) {
    var start_index, end_index, prevcontents;

    if(pb_n === '_last') {
       start_index = state.pblocations[state.pblocations.length - 1].loc;
       end_index = start_index;
       prevcontents = getNewFolio();
    }
    else {
        var next_is_end = false;

        for(let pbloc of state.pblocations) {
            if(next_is_end) {
                end_index = pbloc.loc;
                break;
            } 
            else if(pbloc.n === pb_n) {
                start_index = pbloc.loc;
                next_is_end = true;
            }
        }
        prevcontents = state.xmlTxt.substring(start_index,end_index);
    }

    return {start: start_index, end: end_index, prevcontents: prevcontents};
}

/*
const saveEdit = function() {
    state.editor.save();
    const savetxt = document.getElementById('edit_in_place').value;
    const newtxt = state.xmlTxt.substring(0,state.xml_folio.start) + 
                 savetxt +
                 state.xmlTxt.substring(state.xml_folio.end);
    //state.xmlTxt  = newtxt;
    const xmlParser = new DOMParser();
    const newXmlDoc = xmlParser.parseFromString(newtxt,'text/xml');
    if(newXmlDoc.documentElement.nodeName === 'parsererror')
        alert('XML errors!');
    else {
        state.xmlTxt = newtxt;
        splitSections(newtxt);
        state.xmlDoc = newXmlDoc;
        render.body(newXmlDoc);
    }
}

const saveEditDiv = function() {
    state.editor.save();
    const savetxt = document.getElementById('edit_in_place').value;
    const xmlParser = new DOMParser();
    const divfrag = xmlParser.parseFromString(savetxt,'text/xml');
    if(divfrag.documentElement.nodeName === 'parsererror')
        alert('XML errors!');
    else {
        const newdiv = state.xmlDoc.createRange().createContextualFragment(savetxt);
        state.xml_div.parentNode.replaceChild(newdiv,state.xml_div);
        state.xmlTxt  = state.xmlDoc.documentElement.outerHTML;
        splitSections(state.xmlTxt);
        render.body(state.xmlDoc);
    }
}

const appendFolio = function() {
    initEditor('_last');
}

const destroyEditor = function() {
    const editor = document.getElementById('editor_form');
    if(!editor) return false;
    editor.parentNode.insertBefore(state.prevcontents,editor);
    editor.parentNode.removeChild(editor);
    state.prevcontents = null;
    return true;
}

const initEditor = function(pb_n) {
    
    destroyEditor();

    const xml_folio = extractXMLFolio(pb_n);
    state.xml_folio = xml_folio;
    const textarea = document.createElement('textarea');
    textarea.setAttribute('id','edit_in_place');
    const buttoncontainer = document.createRange().createContextualFragment(
        `<div class="buttoncontainer row">
            <button type="button" id="updatebutton">update</button>
            <button type="button" id="cancelbutton">cancel</button>
        </div>`);
    const form = document.createElement('form');
    form.setAttribute('id','editor_form');
    form.appendChild(textarea);
    form.appendChild(buttoncontainer);

    textarea.value = xml_folio.prevcontents;

    const html_folio = extractHTMLFolio(pb_n);
    state.prevcontents = html_folio.prevcontents;
    
    // this fixes things when you're cutting up a div
    if(html_folio.start.parentNode.getAttribute('id') === 'teibody') {
        html_folio.start.parentNode.insertBefore(form,html_folio.start.nextSibling);
    }
    else {
        html_folio.end.parentNode.insertBefore(form,html_folio.end);
    }
    initCodeMirror(textarea);
}
*/

const findDivNum = function(targ) {
    const alldivs = document.getElementById('teibody')
                            .querySelectorAll('div.story, div.verse, div.para');
    for(let n=0;n<alldivs.length;n++) {
        if(alldivs[n] === targ)
            return n;
    }
}

const getXmlDiv = function(n) {
    const XMLbody = state.xmlDoc.getElementsByTagName('body')[0];
    const alldivs = XMLbody.querySelectorAll('div[type="verse"], div[type="story"], div[type="para"]');
    return alldivs[n];
}

/*
const initEditorDiv = function(targ) {
    
    destroyEditor();
    const divnum = findDivNum(targ);
    const xmldiv = getXmlDiv(divnum);
    state.xml_div = xmldiv;
    const textarea = document.createElement('textarea');
    textarea.setAttribute('id','edit_in_place');
    const buttoncontainer = document.createRange().createContextualFragment(
        `<div class="buttoncontainer row">
            <button type="button" id="updatebutton">update</button>
            <button type="button" id="cancelbutton">cancel</button>
        </div>`);
    const form = document.createElement('form');
    form.setAttribute('id','editor_form');
    if(targ.classList.contains('story'))
        form.setAttribute('class','wider_editor story_editor');
    else
        form.setAttribute('class','wider_editor');
    form.appendChild(textarea);
    form.appendChild(buttoncontainer);
    
    textarea.value = xmldiv.outerHTML;

    targ.parentNode.insertBefore(form,targ);
    state.prevcontents = targ.parentNode.removeChild(targ);
    
    initCodeMirror(textarea);
}

const initCodeMirror = function(textarea) {

    function completeAfter(cm, pred) {
        var cur = cm.getCursor();
        if (!pred || pred()) setTimeout(function() {
          if (!cm.state.completionActive)
            cm.showHint({completeSingle: false});
        }, 100);
        return CodeMirror.Pass;
    }

    function completeIfAfterLt(cm) {
        return completeAfter(cm, function() {
          var cur = cm.getCursor();
          return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) == "<";
        });
    }

    function completeIfInTag(cm) {
        return completeAfter(cm, function() {
          var tok = cm.getTokenAt(cm.getCursor());
          if (tok.type === "string" && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length == 1)) return false;
          var inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
          return inner.tagName;
        });
    }

    state.editor = CodeMirror.fromTextArea(textarea, {
        mode: "xml",
        lineNumbers: true,
        extraKeys: {
          "'<'": completeAfter,
          "'/'": completeIfAfterLt,
          "' '": completeIfInTag,
          "'='": completeIfInTag,
          "Ctrl-Space": "autocomplete"
        },
        hintOptions: {schemaInfo: getSchema()},
        lint: true,
        gutters: ['CodeMirror-lint-markers'],
        lineWrapping: true,
    });
}

const headerEditor = {

    init: function() {
        const editor = document.getElementById('headereditor');
        document.getElementById('teiheader').style.display = 'none';
        const fields = editor.querySelectorAll('input,select,textarea');
        for(let field of fields) {
            let xmlEl = state.xmlDoc.querySelector(field.dataset.select);
            let attr = field.dataset.attr;
            let prefix = field.dataset.prefix;
            let value;

            if(!xmlEl) continue;

            if(attr)
                value = xmlEl.getAttribute(attr);
            else  
                value = xmlEl.innerHTML;

            //if(!value) continue;
            if(!value) value = '';

            if(field.multiple) {
                value = value.split(' ');                
                if(prefix)
                    value = value.map(s => s.replace(newRegExp('^'+prefix),''));
                let opts = field.querySelectorAll('option');
                for(let opt of opts) {
                    if(value.includes(opt.value))
                        opt.selected = true;
                }
            }
            
            else {
                if(prefix)
                    value = value.replace(new RegExp('^'+prefix),'');
                field.value = value;
            }
        }
        editor.style.display = 'block';
        const choices = new Choices(document.getElementById('hd_otherLangs'));
    },

    destroy: function() {
        document.getElementById('headereditor').style.display = 'none';
        document.getElementById('teiheader').style.display = 'block';
    },

    viafSearch: function(imgEl) {
        const search_term = imgEl.parentElement.querySelector('input').value;
        const window_features = "menubar=no,height=500,width=600,centerscreen=yes,scrollbars=yes";
        window.open('https://viaf.org/viaf/search?query=local.names+all+"'+search_term+'"',"VIAFsearch",window_features);
    },

    pancangaSearch: function() {
        const window_features = "menubar=no,height=500,width=600,centerscreen=yes,scrollbars=yes";
        window.open('http://www.cc.kyoto-su.ac.jp/~yanom/pancanga/',"PancangaSearch",window_features);
    },

    update: function() {
        const editor = document.getElementById('headereditor');
        const fields = editor.querySelectorAll('input,select,textarea');
        for(let field of fields) {
            if(!field.validity.valid) {
                alert('Missing information');
                return;
            }
        }
        for(let field of fields) {
            let value = field.type === 'text' ? 
                field.value.trim() : 
                field.value;
            let attr = field.dataset.attr;
            let prefix = field.dataset.prefix;
            let xmlEl = state.xmlDoc.querySelector(field.dataset.select);
            if(!value) {
                if(!xmlEl) continue;
                else {
                    if(attr)
                        xmlEl.setAttribute(attr,'');
                    else
                        xmlEl.innerHTML = '';
                    continue;
                }
            }
            if(!xmlEl) xmlEl = makeElement(state.xmlDoc,field.dataset.select,'fileDesc');
            if(field.multiple) {
                let selected = [];
                for(let opt of field.querySelectorAll('option[selected]'))
                    selected.push(opt.value);
                value = selected.join(' ');
            }
            if(prefix) 
                value = prefix + value;
            if(attr)
                xmlEl.setAttribute(attr,value);
            else  
                xmlEl.innerHTML = value;
        }
        
        // update title field in titleStmt
        const titleStmttitle = state.xmlDoc.querySelector('titleStmt > title');
        const title = state.xmlDoc.querySelector(editor.querySelector('#hd_title').dataset.select).innerHTML;
        const author = state.xmlDoc.querySelector(editor.querySelector('#hd_author').dataset.select).innerHTML;
        const idno = state.xmlDoc.querySelector(editor.querySelector('#hd_idno').dataset.select).innerHTML;
        titleStmttitle.innerHTML = `
        <title type="main">${idno}</title>
        <title type="sub">${title} of ${author}</title>
    `;
        
        state.xmlTxt = state.xmlDoc.documentElement.outerHTML;
        splitSections(state.xmlTxt);
        render.header(state.xmlDoc);
        editor.style.display = 'none';
        document.getElementById('teiheader').style.display = 'block';
    },
}

const makeElement = function(xmlDoc,selector,par) {
    const ns = xmlDoc.querySelector('TEI').namespaceURI;
    var par_el = xmlDoc.querySelector(par);
    const children = selector.split(/[\s>]/g).filter(x => x);
    for(let child of children) {
        let child_el = par_el.querySelector(child);
        if(!child_el) {
            let new_child = xmlDoc.createElementNS(ns,child);
            par_el.appendChild(new_child);
            par_el = new_child;
        }
        else par_el = child_el;
    }
    return par_el;
}
*/
const menu = {
    mouseover: function(e) {
        const targ = e.target.classList.contains('menubox') ?
            e.target :
            e.target.closest(".menubox");
        if(targ) {
            targ.querySelector('ul').style.display = 'block';
            targ.classList.add('open');
        }
    },

    mouseout: function(e) {
        const targ = e.target.classList.contains('menubox') ?
            e.target :
            e.target.closest(".menubox");
        if(targ) {
            targ.querySelector('ul').style.display = 'none';
            targ.classList.remove('open');
        }
    },

    scriptSelect: function(e) {
        if(e.target.tagName !== 'LI') return;
        const script = e.target.dataset.value;
        const scriptlist = document.querySelectorAll('#scriptselect li');
        for(const li of scriptlist) {
            if(li.dataset.value === script)
                li.classList.add('selected');
            else
                li.classList.remove('selected');
        }
        document.querySelector('#scriptselect .heading').textContent = e.target.textContent;

        const teibody = document.getElementById('teibody');
        const middle = viewPos.findPageMiddle();

        state.script = script;

        render.body(state.xmlDoc);
        render.options();    
        viewPos.set(middle);
    },

    widthChange: function(e) {
        const width = e.target.value + '%';
        const teibody = document.getElementById('teibody');
        const middle = viewPos.findPageMiddle();
        teibody.style.width = width;
        teibody.style.marginLeft = (e.target.value > 100) ?
            (100 - e.target.value)/2 + '%' :
            teibody.style.marginLeft = 0;
        viewPos.set(middle);
    },

    showHide: function(e) {
        const str = e.target.dataset.select;
        const checked = e.target.checked;
        const middle = viewPos.findPageMiddle();
        const els = document.querySelectorAll(str);
        if(checked)
            for(const el of els) {
                el.style.visibility = 'visible';
                el.style.width = '';
            }
        else
            for(const el of els) {
                el.style.visibility = 'hidden';
                el.style.width = '0px';
            }
        viewPos.set(middle);
    },

}

const viewPos = {

    findPageMiddle: function() {
        const headerdiv = document.getElementById('teiheader');
        const middle = viewPos.inViewport(headerdiv) ?
            null :
            viewPos.findMiddleElement();
        return middle;
    },

    inViewport: function(el) {
        const rect = el.getBoundingClientRect();
        return el.top >= 0 && el.bottom <= window.innerHeight;
    },

    findMiddleElement: function() {
        const lbs = (state.view === 'folio') ? 
            document.querySelectorAll('.lb') :
            document.querySelectorAll('.lb-minimal');
        const midheight = window.innerHeight/2;
        var lastdist;
        var currdist = null;
        var lastel;
        var midel;
        for(let i=0;i<lbs.length;i++) {
            const lb = lbs[i];
            const rect = lb.getBoundingClientRect();
            const viewportoffset = rect.top;
            if(viewportoffset < 0) continue;
            lastdist = currdist;
            currdist = midheight - viewportoffset;
            if(lastdist != null && Math.abs(currdist) > Math.abs(lastdist)) {
                midel = i-1;
                break;
            }
        }
        if(midel === null)
            midel = lbs.length-1;
        return [midel,lastdist];

    },

    getOffsetTop: function(el) {
        return el.getBoundingClientRect().top + window.pageYOffset;
    },

    set: function(middle) {
        if(middle === null)
            return;
        const midel = (state.view === 'folio') ?
            document.querySelectorAll('.lb')[middle[0]] :
            document.querySelectorAll('.lb-minimal')[middle[0]];
        const dist = viewPos.getOffsetTop(midel) + middle[1] - window.innerHeight/2;
        window.scrollTo(0,dist);
    },
}

const to = {

    smush: function(text,placeholder) {
        text = text.toLowerCase();
        text = text.normalize();

        // remove space between a word that ends in a consonant and a word that begins with a vowel
        text = text.replace(/([ḍdrmvynhs]) ([aāiīuūṛeoêô])/g, '$1$2'+placeholder);
        
        // remove space between a word that ends in a consonant and a word that begins with a consonant
        text = text.replace(/([kgcjñḍtdnpbmrlyvśṣsṙ]) ([kgcjṭḍtdnpbmyrlvśṣshḻ])/g, '$1'+placeholder+'$2');

        // join final o/e/ā and avagraha/anusvāra
        text = text.replace(/([oôeêā]) ([ṃ'])/g,'$1'+placeholder+'$2');

        text = text.replace(/^ṃ/,"'\u200Dṃ"); // initial anusvāra
        text = text.replace(/^ḥ/,"'\u200Dḥ"); // initial visarga
        text = text.replace(/^_y/,"'\u200Dy"); // half-form of ya
        text = text.replace(/ü/g,"\u200Cu");
        text = text.replace(/ï/g,"\u200Ci");

        text = text.replace(/_{1,2}(?=\s*)/g, function(match) {
            if(match === '__') return '\u200D';
            else if(match === '_') return '\u200C';
        });

        return text;
    },

    iast: function(text,from) {
        var from = from || 'devanagari';
        return Sanscript.t(text,from,'iast',{skip_sgml: true});
    },

    devanagari: function(text,placeholder) {

        var text;
        var placeholder = placeholder || '';
        const options = {skip_sgml: true};

        text = text.replace(/ṙ/g, 'r');

        text = text.replace(/^_ā/,"\u093D\u200D\u093E");

        text = to.smush(text,placeholder);

        text = Sanscript.t(text,'iast','devanagari',options);

        text = text.replace(/¯/g, 'ꣻ');

        return text;
    },
    
    malayalam: function(text,placeholder) {

        var text;
        var placeholder = placeholder || '';
        const options = {skip_sgml: true};
	
        const chillu = {
            'ക':'ൿ',
            'ത':'ൽ',
            'ന':'ൻ',
            'മ':'ൔ',
            'ര':'ർ',
        };

        text = text.replace(/^_ā/,"\u0D3D\u200D\u0D3E");

        text = to.smush(text,placeholder);
        text = text.replace(/e/g,'ẽ'); // hack to make long e's short
        text = text.replace(/o/g,'õ'); // same with o
        text = text.replace(/ṙ/g, 'r'); // no valapalagilaka
        text = text.replace(/ṁ/g,'ṃ'); // no malayalam oṃkāra sign
        text = text.replace(/ḿ/g,'ṃ');
        text = text.replace(/î/g,'i'); // no pṛṣṭhamātras
        text = text.replace(/û/g,'u');
        text = text.replace(/ê/g,'e'); 

        text = Sanscript.t(text,'iast','malayalam',options);
	
        // use dot reph
        text = text.replace(/(^|[^്])ര്(?=\S)/g,'$1ൎ');
        
        // use chillu final consonants	
        text = text.replace(/([കതനമര])്(?![^\s\u200C,—’―])/g, function(match,p1) {
            return chillu[p1];
        });
	
        return text;
    },
    
    telugu: function(text,placeholder) {

        var text;
        var placeholder = placeholder || '';
        const options = {skip_sgml: true};

        text = text.replace(/^_ā/,"\u0C3D\u200D\u0C3E");

        text = to.smush(text,placeholder);        
        text = text.replace(/e/g,'ẽ'); // hack to make long e's short
        text = text.replace(/o/g,'õ'); // same with o
        text = text.replace(/ṙ/g,'r\u200D'); // valapalagilaka
        text = text.replace(/ṁ/g,'ṃ'); // no telugu oṃkāra sign
        text = text.replace(/ḿ/g,'ṃ');
        text = text.replace(/î/g,'i'); // no pṛṣṭhamātras
        text = text.replace(/û/g,'u');
        text = text.replace(/ê/g,'e');

        text = Sanscript.t(text,'iast','telugu',options);

        return text;
    },
}

return {
    init: init,
}

}()); // end vetala class

window.addEventListener('load',vetala.init);
