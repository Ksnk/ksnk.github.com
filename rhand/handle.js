$(function () {

    /**
     * отложенный draw - заявка на перерисовку. Можно частить, все равно не должно тормозить
     */
    function draw(after) {
        if (!draw._TO) {
            draw._TO = window.requestAnimationFrame(function () {
                draw._TO = false;
                window.rhand.draw();
                handle(['updatectrl']);

            });
        }
    }

    function drawTrace(){
        $('#programm tr:not(:first)').remove();
        for(let i=0;i<rhand.trace.length;i++) {
            if(rhand.trace[i])
                $('#programm tbody').append('<tr data-data="'+JSON.stringify(rhand.trace[i])+
                    '"><td>'+rhand.tograd(rhand.norm(rhand.trace[i][0]))+'</td><td>'+rhand.tograd(rhand.norm(rhand.trace[i][1]))+'</td><td></td><td></td></tr>');
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
                handle(['updatectrl']);
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
                handle(['updatectrl']);
                break;
            case 'rotate':
                pa = [...rhand.pointA]; pb = [...rhand.pointB];
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
                draw();
                return true;
            case "updatectrl":
                // ищем все контролы прямого отображения и обновляем
                $('input[data-handle]').each(function(){
                    let
                        h=parseData($(this).attr('data-handle')),
                        name = $(this).attr('name').split('[]'), multy=name.length > 1,
                        v=_get(name[0]);

                    if($(this).is('input:text')){
                       if(h[1]=='grad'){
                            $(this).val(rhand.tograd(v));
                        } else {
                            $(this).val(v);
                        }

                    } else if($(this).is('input:checkbox')){
                        if(multy){
                            $(this)[v & $(this).val()?'attr':'removeAttr']("checked","checked");
                        } else {
                            $(this)[$(this).val()==v?'attr':'removeAttr']("checked","checked");
                        }
                    }
                })
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
                let point = rhand.fromscreen([handle.event.offsetX, handle.event.offsetY]);
                play(rhand.moveTo(point));
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
        }
        return false; // стандартный результат - прекращение обработки события
    }

    // обычная реакция на клик и изменения контролов
    $(document).on('submit change click', '[data-handle]', function (e) {
        let that = $(this);
        if (that.is('select') && e.type !== 'change') return;
        if ($(e.target).is('form') && e.type !== 'submit') return;
        if (that.is('.pressHold')) return;
        // if (e.type !== 'click') return;
        var data = parseData(that.attr('data-handle'));
        handle.event = e;
        return handle.call(this, data);
    });
    // визуализация шагов программы
    let look4keys=false;
    $('#programm').on('mouseover',function(e){
        let data=$(e.target).parents('tr').eq(0).data('data');
        if(data && data[0] && data[1]){
            rhand.pointA[2] = data[0];
            rhand.pointB[2] = data[1];
            draw('updatectrl');
            //handle(['updatectrl']);
        }
    });
    $('#programm').hover(function(e){
        look4keys=true;
    }, function(){
        look4keys=false;
    })
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
            }
            //console.log(e);
            return false;
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
            handle(['updatectrl']);
            // генерируем
        } else {
            clearTimeout(timeout);
            clearInterval(interval);
            handle(['updatectrl']);
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
    handle(['updatectrl']);
})