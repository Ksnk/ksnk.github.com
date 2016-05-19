/************************************************************
 *  идея коварно украдена и жестоко покоцана из Moo.js,
 *  Author: Valerio Proietti, <http://mad4milk.net>
 *
 *  схема позволяет писать на один this меньше при адаптации функции
 *  к параметрам, чем при использовании схемы apply_Func...
 */
Function.prototype.bind= function(bind,a,b){
		var fn = this;
		return function(){
			return fn.call(bind, a,b);
		};
	} ;
Function.prototype.bindEH= function(bind,a,b){
		var fn = this;
		return function(e){
			return fn.call(bind, e||window.event,a,b);
		};
	} ;
Function.prototype.delay= function(ms, bind,a,b){
		return setTimeout(this.bind(bind ,a,b), ms);
	} ;
Function.prototype.period= function(ms, bind,a,b){
		return setInterval(this.bind(bind ,a,b), ms);
	} ;

// **********************************************************************
// **  класс для храниения и манипулирования объектами анимации
// **   каждый объект имеет массу, позицию, скорость, может действовать
// **   на другие объекты с какой-то силой.
// **   На этапе анимации, все силы, действующие на объект складываются,
// **   в соответствии со значением силы, вычисляется ускорение объекта,
// **   изменяется скорость, и изменяется позиция... За разьяснениями -
// **   читать учебник физики... (для Вуз'ов!!! Школьный сочиняли вредители)
// **********************************************************************
a_engine=newClass(null,{

    a_items: [] , // array to hold all of a_item's
/************************************************************
 *   работа с курсором
 */
	cursor: {x:0,y:0}, // курсор для работы с драг анд дропом и curs'а
	cursor_handle:function(){
		this.cursor_handle=function(){}; // этакое самоустранение...
		this.add_Handler(this.mousetgt,'mousemove',
                (function (e) {
			    	this.cursor.x=e.clientX;
    				this.cursor.y=e.clientY
    			}).bindEH(this))
    },
/************************************************************
 *  функция очистки сообщения. используется собственно в обработчиках
 */
    clear:function (e) {
    	if (e.preventDefault) e.preventDefault();
    	e.returnValue = false;
        return false;
    },
/************************************************************
 *  установка обработчиков событий
 */
    handlers:[],
/*
 *  установка обработчика событий
 *  если нужно временно поставить обработчики -
 *   нужно сделать this.handlers.push(null), после чего - ставить.
 *   вызов clear_handlers очистит все временные обработчики
 */
    add_Handler: function(a,e,o,c,d){
        if (typeof o=='string') o=this[o].bind(this,a,c,d);
    	if(!o) o=this[e].bind(this,a,c,d);
        if (a.addEventListener)
           a.addEventListener(e,o,false);
        else if (a.attachEvent) {
            try {
                a.attachEvent('on' + e, o);
            } catch (aEx) {}
        }
        this.handlers.push({a:a,e:e,o:o}); // для автоматической чистки хендлов!!!
    },
    clear_handlers:function() {
    	var h;
        while(h=this.handlers.pop()){
        	if (!h) break;
            if (h.a.removeEventListener) {
                h.a.removeEventListener(h.e, h.o, false);
            } else if (h.a.detachEvent) {
                try {
                    h.a.detachEvent('on' + h.e, h.o);
                } catch (aEx) {}
            }
        }
        return this.handlers.length>0
    },
/************************************************************
 *  просто конструктор
 */
	constructor: function (items,prop) {
        if(items) this.add(items);
        this.ahandle=null; // handle для setInterval'а
        this.canvas_element =
			(document.compatMode &&
				document.compatMode == 'CSS1Compat')
			? 'documentElement'
			: 'body';
		// setup some handlers
		if (prop) for(var p in prop) {
			if (p=='link') {
		        var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = prop[p];
                link.media = 'screen';
		        document.getElementsByTagName('head')[0].appendChild(link);
	        }
	    }
	    this.mousetgt=(window.execScript || window.opera)?document:window;

        this.add_Handler(window,'unload','done');
        this.add_Handler(window,'resize','calc_Bounds');
        this.add_Handler(window,'scroll','calc_Bounds');
	},
/************************************************************
 *  добавляем items в движОк
 */
	add: function (items) {
		if(items.length) // is it array?
			for(var i in items) this.add(items[i]);
		else {
			this.a_items.push(items);
			items.Engine=this
		}
	},

	calc_Bounds:function() {
	    var el = document[this.canvas_element],
	        padd = 20; // !!! - заклад на возможный скроллер
	    this.window={x:(window.innerWidth || el.clientWidth) - padd,
	                 y:(window.innerHeight || el.clientHeight) - padd};
	    this.scroll={x:window.scrollX || el.scrollLeft,
	                 y:window.scrollY || el.scrollTop};
	},

	done: function () {
		while(this.clear_handlers()){}
		for(var i=0;i<this.a_items.length;i++) {
			this.a_items[i].done();
		}
        this.mousetgt=null
	},

	paintWhenReady: function () {
		// wait till all images preloaded
		var nfail=true;
		for(var i=this.a_items.length-1;i>=0;i--) {
			if(!(nfail=this.a_items[i].preloaded())) break;
		}
		if (!nfail)
			this.paintWhenReady.delay(500,this);
		else
			this.start_animation.delay(2000,this)
	},

	paint_Item: function (container) {
		var t=document.createElement('div');
		t.id = "seasons_block";
		for(var i=this.a_items.length-1;i>=0;i--) {
			this.a_items[i].paint_Item(t);
		}
		this.elm=container.appendChild(t);
	},

	animate: function () {
	    // вычисление сил, действующих на объекты
	    // инит...
        var i,force = [], a=this.a_items;

		for( i=a.length-1;i>=0;i--) {
			force[i]={x:0,y:0};
			if (a[i].self_act) a[i].self_act(force[i])
		}
		// пробегаем матрицу сил уголком, строим массив воздействий
		if (!this.act_table) {
			this.act_table=[];
			for( i=0;i<a.length-1;i++) {
				for(var j=i+1;j<a.length;j++) {
					if (a[i].act) {
					    if (a[i].act(a[j])!=null)
	  						this.act_table.push({f:a[i],p:a[j],f1:j,f2:i})
					}
					else if (a[j].act) {
					    if (a[j].act(a[i])!=null)
							this.act_table.push({f:a[j],p:a[i],f1:i,f2:j})
					}
				}
			}
		}
		// суммируем равнодействующие силы
		for ( i=this.act_table.length-1;i>=0;i--) {
			var x=this.act_table[i];
			var	v=x.f.act(x.p);
			if(v) {
				force[x.f1].x+=v.x;force[x.f2].x-=v.x;
				force[x.f1].y+=v.y;force[x.f2].y-=v.y
			}
		}

		for( i=0;i<a.length;i++) {
			var b= a[i];
			// конвертируем силу в ускорение
			if (b.mass) {
				force[i].x=force[i].x/b.mass;
				force[i].y=force[i].y/b.mass;
			} else {  // на тело без массы сила не действует
				force[i].x=0;
				force[i].y=0;
			}
			// ускоряемся
			if (b.speed) {
				b.speed.x+=force[i].x;
				b.speed.y+=force[i].y;
			// меняем координаты
				if (b.pos) {
			    	b.pos.x+=b.speed.x;
			    	b.pos.y+=b.speed.y;
			// отображаем новое состояние
			    }
			}
            b.draw(this.window,this.scroll);
		}

	},
	start_animation: function(s) {
		s=s||(this.ahandle==null);
	    if (!s && (this.ahandle!=null)) {
	    	clearInterval(this.ahandle); this.ahandle=null;
	    } else if ((s && (this.ahandle==null))) {
			if (!this.elm) {
				this.paint_Item(document.body);
		        this.calc_Bounds();
			}
	    	this.ahandle=this.animate.period(10,this);
	     	return true ;
	    }
        return false;
	}
});

a_item= newClass(null,{
// fill some properties :
	Engine: null , // ссылка на Engine в котором мы находимся
//	img - create an image to preload and operate
//  chr - to replace a defaut star to something else
    outof: function(w,s) {
		if  (this.pos.y-this.ww.y<s.y) return 1;     //     1
		if  (this.pos.y+this.ww.y>w.y+s.y) return 2; //   3 0 4
		if  (this.pos.x-this.ww.x<s.x) return 3;     //     2
		if  (this.pos.x+this.ww.x>w.x+s.x) return 4;
		return 0;
    },
    assignobj: function(p,prop) {
		var t = prop;    // !!!!!! Highest magic !!!!!!!!!
		this[p]={};
		for (var a in t) this[p][a]= t[a];
    },
    preload:function(src) {
        if (!window.preloads) window.preloads=[]; // А вот так!
       	if (!window.preloads[src]) {
       		(window.preloads[src] = new Image()).src=src;
       	}
    },
	constructor: function (prop) {
	// rebuild your own properties... !!!!!! High magic !!!!!!!!
		for(var p in this)
			if ((typeof this[p]).toLowerCase()=='object')
			    this.assignobj(p,this[p]);
		for( p in prop) {
			if ((typeof (prop[p])).toLowerCase()=='object')
			    this.assignobj(p,prop[p]);
			else
			    this[p]=prop[p]
		}
        if (this.img) this.preload(this.img);
        if (this.img2) this.preload(this.img2);
        this.posx={x:-1000,y:-1000};
	},
	// check if item preloded and ready to paint
	preloaded : function () {
		for(a in {img:0,img2:0})
 		    if(window.preloads[this[a]] && !window.preloads[this[a]].complete) return false;
        return true;
	},
	// clear some trash...
    done: function () {},
    draw: function(w,s)  {
        if(!this.elm) return;
	// не отображаем, если разница меньше 5 пикселей
        if (Math.max(Math.abs(this.posx.x-this.pos.x),
        			 Math.abs(this.posx.y-this.pos.y))>5)
        {
	    	this.elm.style.top=Math.round(this.pos.y-this.ww.y)+'px';
	    	this.elm.style.left=Math.round(this.pos.x-this.ww.x)+'px';
	        this.posx.x=this.pos.x;
	        this.posx.y=this.pos.y
        }
	},
	paint_Item: function (container) {
		// create an element and place him into container
		// hope all images are already preloded...
		var t = null;
		this.ww={x:50,y:50};
    	if (this.img) {
    	   t =document.createElement('img');
    	   with (window.preloads[this.img]){
	    	   t.src=src; //scr or src...
	    	   if (!this.height) this.ww.y=height/2;
	    	   if (!this.width) this.ww.x=width/2
    	   }
    	} else if (this.chr){
    	   t =document.createElement('span');
    	   t.innerHTML=this.chr;
    	}
    	if  (t) {
			if (this.className) t.className=this.className;
			if (this.id) t.id=this.id;
			if (this.height) {
				t.style.height=this.height+'px';
				this.ww.y=this.height/2
			}
			if (this.width) {
				t.style.width=this.width+'px';
				this.ww.x=this.width/2
			}
			if (this.visibility) t.style.visibility=this.visibility;
			this.elm=container.appendChild(t);
		}
	}
});

