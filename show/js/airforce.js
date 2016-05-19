// **********************************************************************
// **  простое применение классов из aengine.js
// **********************************************************************

// элемент - вертолет
helicopter = newClass(a_item,{
    name:'вертолет',
	speed :{x:0,y:0},
    img:'images/b2.gif',
    mass:3,
    waittill:0, // счетчик принятия решения
    self_act: function (e) {
		if (this.waittill>0) this.waittill--;
		else if(this.speed) { // принимаем решение
			this.speed.x=Math.random()*8-4;
			this.speed.y=Math.random()*8-4;
			this.waittill=Math.floor(50+Math.random()*100) ; // 2.5-7 секунд
		}
    },
	draw: function(w,s) {
		switch(this.outof(w,s)) {
			case 3: this.pos.x=w.x-this.ww.x;break;
			case 4: this.pos.x=s.x+this.ww.x;break;
			case 1: this.pos.y=w.y-this.ww.y;break;
			case 2: this.pos.y=s.y+this.ww.y;break;
		}
		this.constructor.prototype.draw.call(this,w,s);
	}
});
// наводится на цель
stinger = newClass(a_item,{
	speed :{x:0,y:0},
    img:'images/pulya03.gif', //'images/pulya12.gif'
    img2:'images/09.gif',
    mass:1,
    visibility:'hidden',
    waittill:0, // счетчик принятия решения
    state:0, // летим-наводимся - 1 взрываемся - 2 отдыхаем 0
    self_act: function (e) {
		if (this.waittill>0) this.waittill--;
		else switch(this.state){ // принимаем решение
			case 0: //становимся в позу и полетели
			    with(this.pos){x=0;y=0}
			    with(this.speed){x=0;y=0}
				this.state=1; // взводим таймер взрыва
				this.waittill=400; // 20 секунд резерва горючего
				break;
			case 1: //не долетели - взрываемся.
				this.makeboom(); break ;
			case 2:	// ждем у моря погоды
				this.pos.x=-1000;this.pos.y=-1000; this.state=0;
		    	with (preloads[this.img]) {
					this.elm.src=src;
					this.elm.style.width=width+'px';
					this.elm.style.height=height+'px';
				}
				this.waittill=60; // 3 сек
				break;
		}
    },

    makeboom: function () {
    	with (preloads[this.img2]) {
			this.elm.src=src;
			this.elm.style.width=width+'px';
			this.elm.style.height=height+'px';
		}

		this.waittill=30 ; this.state=2
    },

    act: function(item) {
    	if (this.state!=1) return {x:0,y:0};
        if (!item.pos) return null;
        var dx=this.pos.x-item.pos.x,
        	dy=this.pos.y-item.pos.y;
		var disp=Math.sqrt(dx*dx+dy*dy);
		if (disp<5) this.makeboom();
		else k=0.9/disp  ;
		return {x:dx*k,y:dy*k};   // наводимся точно на цель, без упреждения
    },

	draw: function(w,s) {
		if (this.outof(w,s)==0)
		{
	        this.constructor.prototype.draw.call(this,w,s);
			if (this.elm.style.visibility!= 'visible')
		    	this.elm.style.visibility='visible'
		}else{
			if (this.elm.style.visibility!= 'hidden') {
		    	this.elm.style.visibility='hidden';
		        this.constructor.prototype.draw.call(this,w,s);
	        }
		}
	}
});

/** более продвинутый ракет, с наведением по "предполагаемой точке" */
stinger1 = newClass(stinger,{
    img:'images/pulya12.gif', //'images/pulya12.gif'

    act: function(item) {
        if (this.state!=1) return {x:0,y:0};
        if (!item.pos) return null;
        var dx=this.pos.x-item.pos.x,
            dy=this.pos.y-item.pos.y;
        var disp=Math.sqrt(dx*dx+dy*dy),k=0; // расстояние до цели.
        if (disp<5) this.makeboom();
        else {
            // полетное время - в
            var t=disp/8,
                ddx=item.pos.x+item.speed.x* t,
                ddy=item.pos.y+item.speed.y* t; // ddx,ddy - новые координаты цели
            dx=this.pos.x-ddx;
            dy=this.pos.y-ddy;
            disp=Math.sqrt(dx*dx+dy*dy); // расстояние до предполагаемой точки.
           // debug(item.pos,item.speed,ddx,ddy,dx,dy,disp, t,'-----');
            k=0.9/disp  ; // k - скорость
        }
        return {x:dx*k,y:dy*k};   // наводимся точно на цель, без упреждения
    }

});
