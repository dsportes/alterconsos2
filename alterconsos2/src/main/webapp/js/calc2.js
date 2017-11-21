/************************************************************/
AC.DD2 = {
	getItem : function(decor, code){
		if (decor && !(code === undefined))
			for(var i = 0, x = null; x = decor[i]; i++){
				if (x.code == code){
					if (!x.html)
						return "<div class='acdd-itemValue bold color16'>" 
							+ x.label.escapeHTML() + "</div>";
					else
						return x.label;
					break;
				}
			}
		return "<div class='acdd-itemValue bold color16'>???</div>"
	},
	
	setdd : function(loc, decor, code){
		if (!loc || !decor || decor.length == 0 || code === undefined)
			return;
		loc.html(this.getItem(decor, code));
	},
	
	regBtn : function(loc, decor, setVal, cb){
		loc.parent().off(APP.CLICK).on(APP.CLICK, function(event){
			APP.NOPROPAG(event);
			AC.DD2.register(loc, decor, setVal, cb);
		});
	},
	
	register : function(loc, decor, setVal, cb, special){
		if (!decor || decor.length == 0 || !cb)
			return;	
		var c = !special ? loc.parent() : loc;
		var os = c.offset();
		var h = c.outerHeight();
		var b = typeof(setVal) == 'number';
		var w = !b ? ";width:" + c.outerWidth() + "px" : ";width:" + setVal + "px";
		if (!special)
			var style = "style='top:" + (os.top + h) + "px;left:" + os.left + "px" + w + "'>";
		else {
			if (setVal > 0)
				var style = "style='top:" + (os.top + h) + "px;left:" + (os.left - setVal + c.width()) + "px" + w + "'>";
			else {
				var w = ";width:" + (-setVal) + "px";
				var style = "style='top:" + (os.top + h) + "px;left:" + os.left + "px" + w + "'>";
			}
		}
	
		var t = new StringBuffer();
		t.append("<div id='acDDcont' class='acDDcont2'>");
		for(var i = 0, x = null; x = decor[i]; i++)
			t.append("<div class='acdd-item' data-index='" + x.code + "'>" 
				+ this.getItem(decor, x.code) + "</div>");
		t.append("<div class='acDDcont2Ann'>Annuler</div>");
		t.append("</div>");
		
		if (!this._mask)
			this._mask = $("#acMask");
		this._mask.css("display", "block");
		this._mask.html(t.toString());
		
		AC.oncl(this, this._mask, function(){
			this._mask.html("");
			this._mask.css("display", "none");
		});
			
		AC.oncl(this, this._mask.find("#acDDcont").find(".acdd-item"), function(target){
			var idx = Util.dataIndex(target);
			var y = null;
			for(var i = 0, x = null; x = decor[i]; i++){
				if (x.code == idx){
					if (setVal && !b) {
						if (!x.html)
							loc.html("<div class='acdd-itemValue bold color16'>" 
								+ x.label.escapeHTML() + "</div>");
						else
							loc.html(x.label);
					}
					y = x;
					break;
				}
			}
			if (y)
				cb(y);				
			this._mask.html("");
			this._mask.css("display", "none");
		});
	}
}

/************************************************************/
$.Class("AC.Widget", {
//
}, {
//
init : function(page, dataacid, decor) {
	if (dataacid) {
		this.dataacid = dataacid;
		this.page = page;
		this.jqCont = this.page._content.find("[data-ac-id='" + this.dataacid + "']");
		this.jqList = this.page._content.find("[data-ac-id='" + this.dataacid + "list']");
		var x = "_" + dataacid;
		this.page[x] = this;
	} else
		this.jqCont = page;
	this.setDecor(decor);
},

setDecor : function(decor) {
},
enable : function(enable) {
},
setValue : function(source, edited) {
},
val : function() {
	return null;
}});

/******************************************************************/
AC.Widget("AC.MultiSelector3", {	
	html : "<div class='acdd-cpt'><span class='acdd-cpt-span bold' data-ac-id='cpt'>"
		+ "</span></div>"

}, {
init : function(page, dataacid, decor, vide) {
	this.setVal = true;
	this.vide = vide ? vide : "<span class='italic'>(Vide)</span>";
	this.codes = [];
	this.hidden = [];
	this._super(page, dataacid, decor);
	this.jqList.html(this.vide);
	this._cpt = this.jqCont.find("[data-ac-id='cpt']");
	if (this._cpt.length == 0) {
		this.jqCont.append(AC.MultiSelector3.html);
		this._cpt = this.jqCont.find("[data-ac-id='cpt']");
	}
	APP.oncl(this, this.jqCont, this.open);
	this.regList();
	this.setCpt();
},

regList : function(){
	var self = this;
	this.jqList.find(".acdd-item").off(APP.CLICK).on(APP.CLICK, function(event){
		APP.NOPROPAG(event);
		var code = parseInt($(event.currentTarget).attr("data-index"), 10);
		if (!(code === undefined)) 
			self.remove(code);
	});
},

open : function(){
	this.setCpt();
	if (this.hidden.length == 0)
		return ;
	var c = this.jqCont;
	var os = c.offset();
	var h = c.outerHeight();
	var w = ";width:" + c.outerWidth() +"px";
	var style = "style='top:" + (os.top + h) + "px;left:" + os.left + "px" + w + "'>";
	
	var t = new StringBuffer();
	t.append("<div id='acDDcont' class='acDDcont2'>");
	for(var i = 0, x = null; x = this.hidden[i]; i++)
		t.append("<div class='acdd-item' data-index='" + x.code + "'>" 
			+ AC.DD2.getItem(this.decor, x.code) + "</div>");
	t.append("<div class='acDDcont2Ann'>Fin</div>");
	t.append("</div>");
	
	if (!this._mask)
		this._mask = $("#acMask");
	this._mask.css("display", "block");
	this._mask.html(t.toString());
	
	AC.oncl(this, this._mask, function(){
		this._mask.html("");
		this._mask.css("display", "none");
	});
		
	AC.oncl(this, this._mask.find("#acDDcont").find(".acdd-item"), function(target){
		this.add(Util.dataIndex(target));
		if (this.hidden.length == 0) {
			this._mask.html("");
			this._mask.css("display", "none");
		} else
			target.remove();
		this.jqCont.trigger('dataentry');
	});

},

remove : function(code){
	var i = this.codes.indexOf(code);
	if (i != -1)
		this.codes.splice(i, 1);
	this.jqList.find("[data-index='" + code + "']").remove();
	this.setCpt();
	if (this.codes.length == 0)
		this.jqList.html(this.vide);
	this.regList();
	this.jqCont.trigger('dataentry');
},

get : function(lst, code){
	if (lst)
		for(var i = 0, x = null; x = this.decor[i]; i++){
			if (x.code == code)
				return x;
		}
	return null;
},

add : function(code, lite){
	if (this.codes.indexOf(code) == -1) {
		if (this.codes.length == 0)
			this.jqList.html("");
		this.codes.push(code);
		var x = AC.DD2.getItem(this.decor, code);
		var t1 = "<div class='acdd-item' data-index='" + code + "'>";
		this.jqList.append(t1 + x + "</div>");
	}
	if (lite)
		return;
	this.setCpt();
	if (this.codes.length == 0)
		this.jqList.html(this.vide);
	this.regList();
},

val : function(x) {
	if (x === undefined)
//		return !this.codes || !this.codes.length ? null : this.codes.sort(AC.Sort.num);
		return !this.codes || !this.codes.length ? [] : this.codes.sort(AC.Sort.num);
	else
		this.setValue(null, x);
},

setDecor : function(decor) {
	this.decor = decor;
	this.setCpt();
},

setCpt : function(){
	this.hidden = [];
	if (this.decor && this.decor.length != 0)
		for(var i = 0, x = null; x = this.decor[i]; i++){
			if (this.codes.indexOf(x.code) == -1)
				this.hidden.push(x);
		}
	if (this._cpt)
		this._cpt.html(this.hidden.length);
},

enable : function(enable) {
	Util.btnEnable(this.jqCont, enable);
	Util.btnEnable(this.jqList, enable);
},

setValue : function(source, edited) {
	if (!edited || edited.length == 0){
		this.codes = [];
		this.jqList.html(this.vide);
		this.setCpt();
		return;
	}
	this.codes = [];
	this.jqList.html("");
	for(var i = 0, x = null; x = edited[i]; i++)
		this.add(x, true);
	this.setCpt();
	if (this.codes.length == 0)
		this.jqList.html(this.vide);
	this.regList();
}

});

/** **************************************************************** */
AC.Widget("AC.CheckBox2", {

}, {
	init : function(page, dataacid, decor, defVal) {
		this.setVal = true;
		this.currentCode = null;
		this._super(page, dataacid, decor);
		this.value = defVal ? true : false;
		this.jqCont.html("<div class='accb-on accb-xx'></div><div class='accb-label bold'></div>");
		this._cb = this.jqCont.find(".accb-xx");
		this._label = this.jqCont.find(".accb-label");
		this._label.html(this.label);
		var self = this;
		this.val(this.value);
		this.jqCont.off(APP.CLICK).on(APP.CLICK, function(event){
			APP.NOPROPAG(event);
			self.set();
		});
	},

	setDecor : function(decor) {
		this.label = decor;
		if (this._label)
			this._label.html(this.label);
	},
	
	set : function(){
		this.setValue(null, !this.value);
		this.jqCont.trigger('dataentry');
	},
	
	enable : function(enable) {
		Util.btnEnable(this.jqCont, enable);
	},
	
	setValue : function(source, current) {
		if (current)
			this._cb.removeClass("accb-off").addClass("accb-on");
		else
			this._cb.removeClass("accb-on").addClass("accb-off");
		this.value = current ? 1 : 0;
	},
	
	val : function(x) {
		if (x === undefined)
			return this.value;
		else
			this.setValue(null, x);
	}

});
/** **************************************************************** */
AC.Widget("AC.Selector3", {

}, {init : function(page, dataacid, decor, setVal) {
	this.currentCode = null;
	this._super(page, dataacid, decor);
	this.setVal = setVal;
},

val : function(x) {
	if (x === undefined)
		return this.currentCode;
	else
		this.setValue(null, x);
},

setDecor : function(decor) {
	this.decor = decor;
	var self = this;
	this.jqCont.parent().off(APP.CLICK).on(APP.CLICK, function(event){
		APP.NOPROPAG(event);
		AC.DD2.register(self.jqCont, self.decor, self.setVal, function(x){
			self.currentCode = x.code;
			self.jqCont.trigger('dataentry');
		});		
	});
},

show : function(){
	var self = this;
	AC.DD2.register(self.jqCont, self.decor, self.setVal, function(x){
		self.currentCode = x.code;
		self.jqCont.trigger('dataentry');
	});	
},

enable : function(enable) {
	Util.btnEnable(this.jqCont.parent(), enable);
},

setValue : function(source, edited) {
	this.jqCont.html(AC.DD2.getItem(this.decor, edited));
}

});

/** **************************************************************** */
AC.Widget("AC.RadioButton", {

}, {init : function(page, dataacid, decor) {
	this.currentCode = null;
	this._super(page, dataacid, decor);
	this.jqCont.addClass("acRBBox");
},

val : function(x) {
	if (!this.decor)
		return null;
	if (x === undefined)
		return this.currentCode;
	this.currentCode = x;
	this._lines.each(function(){
		var c = $(this);
		var code = parseInt(c.attr("data-index"));
		if (x == code){
			c.removeClass("acRBLineUnsel");
			c.addClass("acRBLineSel");
		} else {
			c.removeClass("acRBLineSel");
			c.addClass("acRBLineUnsel");			
		}
	});
},

setDecor : function(decor) {
	if (!decor)
		return;
	this.decor = decor;
	var sb = new StringBuffer();
	for (var i = 0, x = null; x = decor[i]; i++)
		sb.append("<div class='acRBLine acRBLineUnsel' data-index='" + x.code + "'>" + x.label + "</div>");
	this.jqCont.html(sb.toString());
	var self = this;
	this._lines = this.jqCont.find(".acRBLine");
	AC.oncl(this, this._lines, function(target){
		var code = parseInt(target.attr("data-index"));
		this.currentCode = code;
		this.val(code);
		this.jqCont.trigger('dataentry');
	});
},

enable : function(enable) {
	Util.btnEnable(this.jqCont, enable);
}

});

/** **************************************************************** */
AC.Widget("AC.Color", {

}, {init : function(page, dataacid) {
	this.currentCode = null;
	this._super(page, dataacid);
},

val : function(x) {
	if (x === undefined)
		return this.currentCode;
	else {
		this.currentCode = x % 16;
		this.jqCont.find(".acColorSelected").removeClass("acColorSelected");
		this.jqCont.find("[data-index='" + this.currentCode + "']").addClass("acColorSelected");
	}
},

setDecor : function(decor) {
	var t = new StringBuffer();
	t.append("<div class='acColors'>");
	for(var i = 0; i < 16; i++)
		t.append("<div class='acColor color" + i + "' data-index='" + i + "'></div>");
	t.append("</div>");
	this.jqCont.html(t.toString());
	APP.oncl(this, this.jqCont.find(".acColor"), function(target){
		this.val(parseInt(target.attr("data-index"), 10));
		this.jqCont.trigger('dataentry');
	});
},

enable : function(enable) {
	Util.btnEnable(this.jqCont, enable);
}

});

/** **************************************************************** */