$(function () {

    /**
     * отложенный draw - заявка на перерисовку. Можно частить, все равно не должно тормозить
     */
    function draw() {
        if (!draw._TO && !draw._internal) {
            draw._TO = window.requestAnimationFrame(function () {
                draw._TO = false;
                window.rhand.draw();
                updatectrl();
            });
        }
    }
    /**
     * отложенный updatectrl
     */
    function updatectrl() {
        if (!updatectrl._TO) {
            updatectrl._TO = setTimeout(function () {
                updatectrl._TO = false;
                draw._internal=true;
                handle(['updatectrl']);
                draw._internal=false;
            },100);
        }
    }

    function drawTrace(){
        $('#programm tr:not(:first)').remove();
        for(let i=0;i<rhand.trace.length;i++) {
            if(rhand.trace[i])
                $('#programm tbody').append("<tr data-data='"+JSON.stringify(rhand.trace[i])+
                    "'><td>"+rhand.tograd(rhand.norm(rhand.trace[i][0]))+'</td><td>'+rhand.tograd(rhand.norm(rhand.trace[i][1]))+'</td><td></td><td></td></tr>');
        }
    }

    /**
     * вспомогательная функция парсинга данных из атрибута разметки.
     * Удобно для ручного заполнения, работает с Реактом
     * @example
     * data-handle='["rotate",1,-1]'
     * data-handle="rotate,1,-1"
     */
    function parseData(data) {
        if (typeof data === 'object')
            return data;
        if (data.match(/^[{\[].*[}\]]$/))
            return JSON.parse(data);
        else
            return data.split(/\s*,\s*/);
    }

    /**
     * анимировать перемещение манипулятора
     * @param {{x:number,y:number}[]}trace
     */
    function play(trace) {
        let cur = 0;
        if (!!play.i) clearInterval(play.i);
        play.i = setInterval(function () {
            if (cur >= trace.length) {
                clearInterval(play.i);
                play.i = false;
                updatectrl();
                return;
            }
            rhand.pointA[2] = trace[cur][0];
            rhand.pointB[2] = trace[cur][1];
            draw();
            cur++;

        }, 50);
    }

    /**
     * выдать значение по адресной последовательности
     * @param addr
     * @returns {any}
     * @private
     */
    function _get(addr){
        let undef,name=addr.split('.'),r=rhand;
        while(name.length>0){
            if(undef==(r=r[name.shift()])) return;
        }
        return r;
    }

    /**
     * по адресной последовательности присвоить значение
     * @param addr
     * @param val
     * @private
     */
    function _set(addr, val){
        let undef,name=addr.split('.'),r=rhand;
        while(name.length>1){
            if(undef==(r=r[name.shift()])) return;
        }
        r[name]=val;
    }

    /**
     * универсальный обработчик событий программы,
     * @example:
     * - handle(['rotate',1,-1]) - с параметрами
     * - handle([['rotate',1,-1],['rotate',1,-1],['rotate',1,-1],['rotate',1,-1]])
     *  -- несколько команд в одном флаконе, удобно для ajax
     */
    window.handle = function (whattodo) {
        var pa,pb,undef;
        if (whattodo && whattodo[0] && whattodo[0].constructor && whattodo[0].constructor === Array) {
            // нам передан массив массивов
            for (var x in whattodo) {
                handle.call(this, whattodo[x])
            }
            return false; // в этом случае нет возможности выдать другой результат
        }
        var reason = whattodo[0] || '';
        switch (reason) {
            case 'letsfly':
                var elem = document.createElement( 'script' );
                elem.type = 'text/javascript';
                elem.async = true;
                document.body.appendChild( elem );
                elem.src = location.href.replace(/\/rhand.*$/,'/Fly/fly.js');
                break;
            case 'pin':
                // забрать имеющиеся значения манипулятора и поставить в нужные значения
                if(whattodo[1]=='angle') {
                    _set(whattodo[2],[rhand.pointA[2],rhand.pointB[2]]);
                } else {
                    _set(whattodo[2],[rhand.finC[0],rhand.finC[1]]);
                }
                updatectrl();
                break;
            case 'rotate':
                pa = [...rhand.pointA];
                pb = [...rhand.pointB];
                (whattodo[1] > 0 ? pb : pa)[2] += rhand.torad(whattodo[2]);
                let x = rhand.calc_silent(pa, pb);
                if (!isNaN(x[2][0])) {
                    window.rhand[whattodo[1] > 0 ? 'pointB' : 'pointA'][2] += rhand.torad(whattodo[2]);
                    draw();
                }
                break;
            case "submitdraw":
                // изменение контрола и redraw
                let i = $(this), name = i.attr('name').split('[]'), multy = name.length > 1;
                name=name[0].split('.');
                let r=rhand;
                while(name.length>1){
                    r=r[name.shift()];
                }
                name=name[0];
                if (i.is('input:checkbox')) {
                    if (multy) {
                        if (i[0].checked) {
                            r[name] |= i[0].value;
                        } else {
                            r[name] &= ~i[0].value;
                        }
                    } else {
                        if (i[0].checked) {
                            r[name] = i[0].value;
                        } else {
                            r[name] = null;
                        }
                    }
                } else if (i.is('input:text')) {
                    if (!multy) {
                        r[name] = 0+i.val();
                        if(whattodo[1]==='grad'){
                            r[name]=rhand.torad(r[name]);
                        }
                    }
                }
                updatectrl();
                draw();
                return true;
            case "updatectrl":
                // ищем все контролы прямого отображения и обновляем
                $('input[data-handle]').each(function(){
                    let
                        h=parseData($(this).attr('data-handle')),
                        name = ($(this).attr('name')||'').split('[]'), multy=name.length > 1,
                        v=_get(name[0]);

                    if($(this).is('input:text')){
                       if(h[1]=='grad'){
                            $(this).val(rhand.tograd(v));
                        } else {
                            $(this).val(v);
                        }

                    } else if($(this).is('input:checkbox')){
                        if(multy){
                            $(this).prop('checked',v & $(this).val());
                        } else {
                            $(this).prop('checked',$(this).val()==v);
                        }
                    }
                })
                // отмечаем режим рисования
                pb=$('button.painting.active'), ab=false;
                if(rhand.painting=='clear') {
                    ab=$('button.painting[data-handle=clearpaint]');
                } else if(rhand.painting=='obstacles' || rhand.painting=='obstaclesfin') {
                    ab=$('button.painting[data-handle=paint]');
                }
                if(pb.not(ab).length>0) pb.not(ab).removeClass('active');
                if(ab.length>0) ab.addClass('active');
                draw();
                return true;
            // break;
            case "tab":
                // открыть таб с номером whattodo[1]
                let that = $(this).addClass('active'),
                    parent = that.parents('.tab').eq(0).parent(),
                    reltab = $('.tabcontent', parent).eq(whattodo[1]).addClass('active');
                $('.tablinks, .tabcontent', parent).not(that).not(reltab).removeClass('active');
                break;

            case 'mapclick':
                if(rhand.painting=='clear'){
                    let x=rhand.fromscreen([handle.event.offsetX, handle.event.offsetY]);
                    for(let a in rhand.Obstacles){
                        let o=rhand.Obstacles[a];
                        if(rhand.distP(o[0],o[1],x)<5){
                            rhand.Obstacles.splice(a, 1);
                            break;
                        }
                    }
                    rhand.mapit();
                    rhand.painting='';
                    draw();
                } else if(rhand.painting=='obstacles'){
                    let x=rhand.fromscreen([handle.event.offsetX, handle.event.offsetY]);
                    rhand.Obstacles.push([x,x]);
                    rhand.painting='obstaclesfin';
                    updatectrl();
                    draw();
                } else if(rhand.painting=='obstaclesfin'){
                    let x=rhand.fromscreen([handle.event.offsetX, handle.event.offsetY]);
                    if(rhand.Obstacles.length>0){
                        let y= rhand.Obstacles.pop();
                        y[1]=x;
                        rhand.Obstacles.push(y);
                    }
                    rhand.painting='';
                    rhand.mapit();
                    updatectrl();
                    draw();
                } else {
                    let point = rhand.fromscreen([handle.event.offsetX, handle.event.offsetY]);
                    play(rhand.moveTo(point));
                }
                break;

            case 'load':
                rhand.unserialize(localStorage.getItem('rhand'));
                break;
            case 'store':
                localStorage.setItem('rhand',rhand.serialize());
                break;

            case 'calc':
                // расчет маршрута с точки startA
                // до точки finA
                rhand.trace=rhand.buildtrace();
                play(rhand.trace);
                drawTrace();
                break;

            case 'copyjson':
                // so fill a json value
                let sel=$(whattodo[1]),names=whattodo[2], val={};
                for(let a in names){
                    if(names.hasOwnProperty(a) && rhand.hasOwnProperty(names[a])) {
                        val[names[a]] = rhand[names[a]];
                    }
                }
                val.note = 'please! use this values in proper ways';
                sel.val(JSON.stringify(val));
                sel[0].select();
                document.execCommand("copy");
                sel.val('');
                break;

            case 'pastejson':
                let _sel=$(whattodo[1]),_rm=false,_dt=false,_val={},
                    data=_sel.val()||'',
                    _names=whattodo[2];
                if(''==data){
                    let clipboardData = handle.event.originalEvent.clipboardData || window.clipboardData;
                    data = clipboardData && clipboardData.getData('Text') ||'';
                }
                if(data=='') return;
                _val=JSON.parse(data);
                _sel.val('');
                for(let a in _names){
                    if(_names.hasOwnProperty(a) && rhand.hasOwnProperty(_names[a])) {
                        rhand[_names[a]]=_val[_names[a]] ;
                        if('trace'==_names[a]) _dt=true;
                        if('Obstacles'==_names[a]) _rm=true;
                    }
                }
                _dt && rhand.mapit();
                //updatectrl();
                _dt && drawTrace();
                draw();
                break;

            case 'pastepath':
                (function() {
                    let sel = $(whattodo[1]),
                        data = sel.val() || '';
                    if ('' == data) {
                        let clipboardData = handle.event.originalEvent.clipboardData || window.clipboardData;
                        data = clipboardData && clipboardData.getData('Text') || '';
                    }
                    if (data == '') return;
                    // рисуем
                    let canvas = document.getElementById("canvas");
                    //canvas.setAttribute("height", Math.round(zoom*(maxy-miny)+this.border*2));
                    //canvas.setAttribute("width",Math.round(zoom*(maxx-minx)+this.border*2));
                    let ctx = canvas.getContext("2d");
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "white";
                    ctx.fillStyle = "white";

                    let p = new Path2D(data);
                    ctx.fill(p);
                })();
                break;
            case 'paint':
                rhand.painting='obstacles';
                updatectrl();
                break;
            case 'clearpaint':
                rhand.painting='clear';
                updatectrl();
                break;
        }
        return false; // стандартный результат - прекращение обработки события
    }

    // обычная реакция на клик и изменения контролов
    $(document).on('submit change click paste', '[data-handle]', function (e) {
        let that = $(this);
        if (that.is('select') && e.type !== 'change') return;
        if ($(e.target).is('form') && e.type !== 'submit') return;
        if (that.is('.pressHold')) return;
        // if (e.type !== 'click') return;
        // if (e.type !== 'click') return;
        if(e.type='paste'){
            // Stop data actually being pasted into div
            e.stopPropagation();
            e.preventDefault();
        }
        handle.event = e;
        var data = parseData(that.attr('data-handle')),ret=handle.call(this, data);
        handle.event =null;
        return ret;
    });
    // визуализация шагов программы
    let look4keys=false;

    function show(tr){
        let data=tr.data('data');
        if(data && data[0] && data[1]){
            rhand.pointA[2] = data[0];
            rhand.pointB[2] = data[1];
            draw();
        }
    }
    $('#programm').on('click',function(e){
        let x=$('tr.active',this),
            tr=$(e.target).parents('tr').eq(0);
        x.not(tr).removeClass('active');
        tr.addClass('active');
        show(tr);
    });
    $('#programm').hover(function(e){
        look4keys=true;
    }, function(){
        look4keys=false;
    });
    $(document).on('keydown', function(e){
        if(look4keys){
            let move=false;
            if(!!e.originalEvent.key){
                if(e.originalEvent.key=='ArrowDown')
                    move=1;
                else if(e.originalEvent.key=='ArrowUp')
                    move=-1;
            }
            if(false!==move){
                let that=$('#programm'),parent=that.parent(),h=$('tr:eq(1)', that).height();
                if(move>0){
                    parent.scrollTop(parent.scrollTop()+h);
                } else {
                    parent.scrollTop(parent.scrollTop()-h);
                }
                let x=$('tr.active',that), y;
                if(move>0){ y=x.next();} else {y=x.prev();}
                if(y.length>0){
                    x.removeClass('active');y.addClass('active');
                    show(y);
                }
            }
            //console.log(e);
            return false;
        } else if('Escape'==e.originalEvent.key && rhand.painting!=''){
            rhand.painting='';
            updatectrl();
        }
        //return false;
    })

    // реакция на pressHold событие. Непрерывная генерация событий
    var timeout = false, interval = false;
    $(document).on('mousedown mouseup mouseleave', '.pressHold[data-handle]', function (e) {
        if (e.type === 'mousedown') {
            var that = this, data = parseData($(this).attr('data-handle'));
            // is it hold ?
            handle.event = e;
            timeout = setTimeout(function () {
                interval = setInterval(function () {
                    handle.call(that, data);
                }, 50);
            }, 300);
            handle.call(that, data);
            handle.event = null;
            updatectrl();
            // генерируем
        } else {
            clearTimeout(timeout);
            clearInterval(interval);
            updatectrl();
            // прекращаем
        }
        return false;
    });
    window.addEventListener('beforeunload', function(e) {
        handle(['store']);
        e.preventDefault();
        //e.returnValue = '';
        return true;
    });
    handle(['load']);
    window.rhand.mapit();
    draw();
    drawTrace();
})