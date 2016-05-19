sputnik = newClass(a_item,{
	mass  : 1000,
	visibility: 'hidden',
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

planet = newClass(sputnik,{
// притяжение между телами обратно пропорционально квадрату расстояния
	act: function (item) {
// расстояние
        if (!item.pos) return;
        var dx=this.pos.x-item.pos.x,
        	dy=this.pos.y-item.pos.y;
		var qdisp=dx*dx+dy*dy,disp=Math.sqrt(qdisp);
		if (disp<10) k = 10 ;
		else k=((this.mass+item.mass)*5000/disp)/qdisp  ;
		return {x:dx*k,y:dy*k};
	}
});
