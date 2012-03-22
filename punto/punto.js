/**
 * Javascript port for keycode-switch function from
 * http://habrahabr.ru/post/140351/
 */

var orfFilter = (function () {

    var $delChar = /[\!&\?\/]/,
        $countErrorWords = 1,
        $errorWords = {"b":true, "d":true, "yt":true, "jy":true, "yf":true, "z":true, "xnj":true, "c":true, "cj":true, "njn":true, ",snm":true, "f":true, "dtcm":true, "'nj":true, "rfr":true, "jyf":true, "gj":true, "yj":true, "jyb":true, "r":true, "e":true, "ns":true, "bp":true, "pf":true, "ds":true, "nfr":true, ";t":true, "jn":true, "crfpfnm":true, "'njn":true, "rjnjhsq":true, "vjxm":true, "xtkjdtr":true, "j":true, "jlby":true, "tot":true, ",s":true, "nfrjq":true, "njkmrj":true, "ct,z":true, "cdjt":true, "rfrjq":true, "rjulf":true, "e;t":true, "lkz":true, "djn":true, "rnj":true, "lf":true, "ujdjhbnm":true, "ujl":true, "pyfnm":true, "vjq":true, "lj":true, "bkb":true, "tckb":true, "dhtvz":true, "herf":true, "ytn":true, "cfvsq":true, "yb":true, "cnfnm":true, ",jkmijq":true, "lf;t":true, "lheujq":true, "yfi":true, "cdjq":true, "ye":true, "gjl":true, "ult":true, "ltkj":true, "tcnm":true, "cfv":true, "hfp":true, "xnj,s":true, "ldf":true, "nfv":true, "xtv":true, "ukfp":true, ";bpym":true, "gthdsq":true, "ltym":true, "nenf":true, "ybxnj":true, "gjnjv":true, "jxtym":true, "[jntnm":true, "kb":true, "ghb":true, "ujkjdf":true, "yflj":true, ",tp":true, "dbltnm":true, "blnb":true, "ntgthm":true, "nj;t":true, "cnjznm":true, "lheu":true, "ljv":true, "ctqxfc":true, "vj;yj":true, "gjckt":true, "ckjdj":true, "pltcm":true, "levfnm":true, "vtcnj":true, "cghjcbnm":true, "xthtp":true, "kbwj":true, "njulf":true, "dtlm":true, "[jhjibq":true, "rf;lsq":true, "yjdsq":true, ";bnm":true, "ljk;ys":true, "cvjnhtnm":true, "gjxtve":true, "gjnjve":true, "cnjhjyf":true, "ghjcnj":true, "yjuf":true, "cbltnm":true, "gjyznm":true, "bvtnm":true, "rjytxysq":true, "ltkfnm":true, "dlheu":true, "yfl":true, "dpznm":true, "ybrnj":true, "cltkfnm":true, "ldthm":true, "gthtl":true, "ye;ysq":true, "gjybvfnm":true, "rfpfnmcz":true, "hf,jnf":true, "nhb":true, "dfi":true, "e;":true, "ptvkz":true, "rjytw":true, "ytcrjkmrj":true, "xfc":true, "ujkjc":true, "ujhjl":true, "gjcktlybq":true, "gjrf":true, "[jhjij":true, "ghbdtn":true, "pljhjdj":true, "pljhjdf":true, "ntcn":true, "yjdjq":true, "jr":true, "tuj":true, "rjt":true, "kb,j":true, "xnjkb":true, "ndj.":true, "ndjz":true, "nen":true, "zcyj":true, "gjyznyj":true, "x`":true, "xt":true},
        $expectWord = {"\.ьу":"/me"},
        $arrReplace = {"q":"й","w":"ц","e":"у","r":"к","t":"е","y":"н","u":"г","i":"ш","o":"щ","p":"з","[":"х","]":"ъ","a":"ф","s":"ы","d":"в","f":"а","g":"п","h":"р","j":"о","k":"л","l":"д",";":"ж","'":"э","z":"я","x":"ч","c":"с","v":"м","b":"и","n":"т","m":"ь",",":"б",".":"ю","/":".","`":"ё","Q":"Й","W":"Ц","E":"У","R":"К","T":"Е","Y":"Н","U":"Г","I":"Ш","O":"Щ","P":"З","{":"Х","}":"Ъ","A":"Ф","S":"Ы","D":"В","F":"А","G":"П","H":"Р","J":"О","K":"Л","L":"Д",":":"^","\"":"Э","|":"/","Z":"Я","X":"Ч","C":"С","V":"М","B":"И","N":"Т","M":"Ь","<":"Б",">":"Ю","?":",","~":"Ё","@":"\"","#":"№","$":";","^":":","&":"?","й":"q","ц":"w","у":"e","к":"r","е":"t","н":"y","г":"u","ш":"i","щ":"o","з":"p","х":"[","ъ":"]","ф":"a","ы":"s","в":"d","а":"f","п":"g","р":"h","о":"j","л":"k","д":"l","ж":";","э":"'","я":"z","ч":"x","с":"c","м":"v","и":"b","т":"n","ь":"m","б":",","ю":".","ё":"`","Й":"Q","Ц":"W","У":"E","К":"R","Е":"T","Н":"Y","Г":"U","Ш":"I","Щ":"O","З":"P","Х":"{","Ъ":"}","Ф":"A","Ы":"S","В":"D","А":"F","П":"G","Р":"H","О":"J","Л":"K","Д":"L","Ж":":","Э":"\"","Я":"Z","Ч":"X","С":"C","М":"V","И":"B","Т":"N","Ь":"M","Б":"<","Ю":">","Ё":"~","№":"#"};

    return function ($string){
        var result = $string.toLowerCase().replace($delChar,'').split(/\s+/);
        var $countError=0;
        for(var i=0;i<result.length;i++){
            if($errorWords[result[i]])
            $countError++;
        }
        if ($countError< $countErrorWords)
            return $string;
        result='';
        for(i=0;i<$string.length;i++){
            result += $arrReplace[$string.charAt(i)] || $string.charAt(i);
        }
        for(i in $expectWord){
            result = result.replace(new RegExp(i), $expectWord[i]);
        }
        return result;

    }
})();