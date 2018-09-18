$.Class("AC.Stack",{
	
	pile : [],
	
	cp: -1,
		
	clickChoice: function(stackName, master, choice){
		if (!master.option)
			master.option = {};
		master.option.choice = choice;
		master.jsOption = JSON.stringify(master.option);
		this.showON(stackName, master);
	},
	
	showON: function(stackName, master, newG){
		if (this.cp != -1 && this.cp != this.pile.length - 1){
			this.pile.splice(this.cp + 1, this.pile.length - this.cp -1);
		}
		var cpMaster = $.parseJSON(JSON.stringify(master));
		if (this.cp >= 0)
			this.pile[this.cp].scroll = Util.getScroll();
		this.pile.push({stackName:stackName, master:cpMaster, newG:newG});
		if (this.pile.length > 10)
			this.pile.splice(0, 1);
		else
			this.cp++;
		if (AC.dbg){
			AC.info("showON: " + stackName + " - cp/nb: " + this.cp + "/" 
				+ this.pile.length + " - newG: " + (newG ? "true" : "false") +" - master: " + JSON.stringify(master));
		}
		this.enable();
	},
	
	enable: function(){
		AC.IconBar.enableBack(this.cp > 0);
		AC.IconBar.enableForward(this.cp < this.pile.length - 1);
	},
	
	back: function(){
		if (this.cp <= 0)
			return;
		var old = this.pile[this.cp];
		if (old.newG && AC.StackG.current)
			AC.StackG.current.close();
		this.cp--;
		var obj = this.pile[this.cp];
		if (obj.stackName == "StackG" && !AC.StackG.current) {
			AC.StackG.current = new AC.StackG();
			obj.newG = true;
		}
		var s = obj.stackName == "StackG" ? AC.StackG.current : AC.StackL.current;
		if (s)
			s.showX(obj.master);
		this.enable();
		setTimeout(function(){
			scrollTo(obj.scroll.x, obj.scroll.y);
		}, 500);
	},
	
	forward: function(){
		if (this.cp >= this.pile.length - 1)
			return;
		this.cp++;
		var obj = this.pile[this.cp];
		if (obj.stackName == "StackG" && !AC.StackG.current) {
			AC.StackG.current = new AC.StackG();
			obj.newG = true;
		}
		var s = obj.stackName == "StackG" ? AC.StackG.current : AC.StackL.current;
		if (s)
			s.showX(obj.master);		
		this.enable();
		if (obj.scroll)
			scrollTo(obj.scroll.x, obj.scroll.y);
	},
	
	close: function(){
		this.pile = [];
		this.cp = -1;
		this.enable();
	}
},{
	init : function(_container, classes, bottomClass){
		this.classes = classes;
		this.bottomClass = bottomClass;
		this._rootContainer = _container;
		this.stack =[];
		for(var cl in this.classes){
			var x = this.classes[cl];
			x.parents = [];
			var parent = cl;
			while (parent){
				x.parents.unshift(parent);
				parent = this.classes[parent].parent;
			}
		}
	},
	
	validAncestor : function(level, arg){
		var m = this.stack[level].master;
		var parents = this.classes[arg.type].parents;
		if (parents.indexOf(m.type) == -1)
			return false;	
		var ids = this.classes[m.type].ids;
		for(var i = 0, id = null; id = ids[i]; i++){
			if (!(arg[id] === m[id]))
				return false;
		}
		return true;
	},
	
	show: function(arg, newG){
		AC.Stack.showON(this.name, arg, newG);
		this.showX(arg);
	},
	
	showX : function(arg){
		this.removeCurrentChoice();
		if (!this.classes[arg.type])
			throw new Error("AC.Stack.show() / arg.type : [" + arg.type + "] pas trouvé");
		if (arg.option)
			arg.jsOption = JSON.stringify(arg.option);
		if (this.stack.length == 0){
			this.show2(arg, 0);
			return;
		}
		var level = 0;
		var found = false;
		while(level < this.stack.length) {
			if (this.validAncestor(level, arg)){
				if (arg.type === this.stack[level].master.type){
					found = true;
					break;
				}
				level++;
			} else
				break;
		}
		if (found){
			if (level == this.stack.length - 1){
				// déja affiche en queue
				this.stack[level].resetOption(arg.option);
				return; 
			}
			// affiché mais pas en queue: fermer au-dessus de level
			var self = this;
			this.stack[this.stack.length - 1].close(level + 1, function(){
				var x = self.stack[level];
				x.resetOption(arg.option);
				x.expand(null, true);
			});
			return;
		}
		
		if (this.stack.length > level) {
			// effacer au-dessous de l'ancêtre commun (a minima la racine)
			var self = this;
			this.stack[this.stack.length - 1].close(level, function(){
				self.show2(arg, level);
			});
		} else
			this.show2(arg, level);
	},
		
	show2 : function(arg, level){
		var self = this;
		var cl = this.classes[arg.type];
		var type = cl.parents[level];
		if (!AC["Step" + type])
			throw new Error("AC.Stack.show() / type : [" + type + "] classe pas trouvée");
		if (cl.parents.length == level + 1)
			new AC["Step" + type](this, level, arg, null);
		else {
			var narg = {type:type, jsOption:arg.jsOption};
			for(var i = 0; i <= level; i++){
				var cli = this.classes[cl.parents[i]];
				for(var j=0, id=null; id = cli.ids[j]; j++)
					narg[id] = arg[id];
			}
			new AC["Step" + type](this, level, narg, function(){
				level++;
				self.show2(arg, level);
			});
		}
	},
	
	removeCurrentChoice : function(){
	},
	
	trunk : function(){
		this.stack.splice(this.stack.length - 1, 1);
	},
	
	close : function(){
		for(var i = 0; i < this.stack.length; i++){
			var step = this.stack[i];
			step.unregisterMaster();
		}
	}
	
});

/*****************************************************/
$.Class("AC.Step", {
	trTime : 200,
	
	html1a : "<div class='acsTop'><div class='acsTitle'>"
		+ "<div class='acsBtnTI'><img class='acsBtnTImg' src='images/info.png'/></div>"
		+ "<div class='acsNP'>"
		+ "<div class='acsNPP'></div>"
		+ "<div class='acsNPN'></div>"
		+ "<div class='acsNP1N small'></div></div>",

	html1c : "<div class='acsTitleI large'/></div>"
		+ "<div class='acsHead'/><div class='acsMenu'/></div>"
		+ "<div class='",
			
	html2 : "<div class='acsSys'/><div class='acsWork'/>"
	
},{
	init : function(stack, level, master, callBack){
		stack.stack.push(this);
		this.myClass = stack.classes[master.type];
		this.callBack = callBack;
		this.myStack = stack;
		this.level = level;
		this.master = master;
		this.option = this.master.jsOption ? $.parseJSON(this.master.jsOption) : null;
		this.attached = [];
		this.isShort = true;
		this.isReady = false;
		this.choice = this.option && this.option.choice ? this.option.choice : null;
		if (!this.choice && this.myClass.start)
			this.choice = this.myClass.start;
		this.myParent = this.level != 0 ? this.myStack.stack[this.level - 1] : null;
		this.registerMaster(this.master);
		this._container = this.level != 0 ? this.myParent._bottom : this.myStack._rootContainer;
		this.setFrame2();
	},
	
	setFrame2 : function(){
		var h1 = this.level ? this.constructor.html1a : "";
		this._container.html(h1 + this.constructor.html1c + this.myStack.bottomClass 
				+ " " + this.myStack.bottomClass + (this.level + 1) + "'></div>");
		this._title = this._container.find(".acsTitle");
		this._acsNP = this._title.find(".acsNP");
		this._acsNP.css("display", "none");
		this._acsNP1N = this._acsNP.find(".acsNP1N");
		this._acsNPP = this._acsNP.find(".acsNPP");
		this._acsNPN = this._acsNP.find(".acsNPN");
		this._head = this._container.find(".acsHead");
		this._menu = this._container.find(".acsMenu");
		this._bottom = this._container.find("." + this.myStack.bottomClass);
		if (this.level) {
			var title = this.myClass.title;
			if (title)
				this.setTitle(title);
		}
		this._infoBtn = this._title.find(".acsBtnTI");
		APP.oncl(this, this._head, function(target){
			var last = this.myStack.stack.length - 1;
			if (this.level == last)
				return;
			var self = this;
			this.myStack.stack[last].close(this.level + 1, function(){
				AC.Stack.showON(self.myStack.name, self.master);
				self.expand(null, true);
			})
		});

		AC.Req.syncAndDo(this, this.setFrame3);
	},
	
	setFrame3 : function(){
		this.drawHead();
		this.drawMenu();
   		if (this.callBack)
			// partiel, bottom vide
			this.callBack();
		else
			this.expand(this.ready, true);
	},
	
	setTitle : function(text){
		this._title.find(".acsTitleI").html(text.escapeHTML());
	},
		
	short : function(cb){
		this._acsNP.css("display", "none");
		if (!this.isShort){
			this.isShort = true;
			this._bottom.html("");
	   		if (cb)
	   			cb();
	  		return;
		}
		if (cb)
	   		cb();
	},
	
	expand : function(cb, forced){
		if (forced || this.isShort){
			this._bottom.html(this.constructor.html2);
			this._sys = this._bottom.find(".acsSys");
			this._work = this._bottom.find(".acsWork");
			this._bottom.removeClass(this.myStack.bottomClass);
			if (this.myParent)
				this.myParent._bottom.addClass(this.myStack.bottomClass);
			if (this.level != 0) {
				this.myParent._acsNP.css("display", "none");
				this._acsNP.css("display", "block");
				APP.oncl(this, this._acsNPP, this.previousItem);
				APP.oncl(this, this._acsNPN, this.nextItem);
			}
			this.drawSys();
			this.drawWork();
			this.isShort = false;
	   		if (cb)
	   			cb();
	  		return;
		}
		if (cb)
	   		cb();
	},
	
	close : function(level, cb){
		if (level > this.level)
			return;
		this.unregisterMaster();
		var self = this;
		this.short(function(){
			self.close2(level, cb);
		})
	},
	
	close2 : function(level, cb){
  		this._container.html("");
   		this.myStack.trunk();
   		if (level != this.level)
   			this.myParent.close(level, cb);
   		else {
   			if (cb)
   				cb();
   		}
	},
	
	attachMe : function(child){
		if (this.attached.indexOf(child) == -1)
			this.attached.push(child);
	},

	drawMenu : function(){
		var t = new StringBuffer();
		
		var pf1 = true;
		for (var i = 0, a = null; a = this.myClass.actions[i]; i++){
			var m = this["hasAction_" + a.id];
			if (m && !m.call(this))
				continue;
			if (pf1)
				t.append("<div class='acsLocActions bold'>");
			t.append("<div class='acsLocAction acsIcon" 
				+ a.icon + "' data-action='" + a.id + "'>" + a.lib + "</div>");
			pf1 = false;
		}
		if (!pf1)
			t.append("</div>");
		
		var ac1 = false;
		var n = 0;
		for (var i = 0, a = null; a = this.myClass.choices[i]; i++){
			var m = this["hasChoice_" + a.id];
			if (m && !m.call(this))
				continue;
			n++;
		}
		if (n > 1) {
			this.hasTabs = true;
			t.append("<div class='acsTabs'>");
			var z = "<div class='acTab" + n + " acsChoix acsTabX' data-choice='";
			for (var i = 0, a = null; a = this.myClass.choices[i]; i++){
				var m = this["hasChoice_" + a.id];
				if (m && !m.call(this))
					continue;
				if (!ac1)
					ac1 = true;
				t.append(z + a.id + "'>" + (a.libc ? a.libc : a.lib) 
					+ " <img class='acsBtnTImg2 acsInfoTab' data-index='" + a.id + "' src='images/info.png'/></div>");
			}
			t.append("</div>");
		}
		this._menu.html(t.toString());
		
		APP.oncl(this, this._menu.find(".acsLocAction"), function(target){
			var action = target.attr("data-action");
			var m = this["action_" + action];
			if (m)
				m.call(this);
		});
		
		APP.oncl(this, this._menu.find(".acsInfoTab"), function(target){
			var href = "Step" + this.master.type + "_" + target.attr("data-index");
			AC.Help.gotoHelp(href);
		});

		APP.oncl(this, this._menu.find(".acsChoix"), function(target){
			this.choice = target.attr("data-choice");
			var last = this.myStack.stack.length - 1;
			if (this.level == last) {
				AC.Stack.clickChoice(this.myStack.name, this.master, this.choice);
				this.setCurrentChoice();
				return;
			}
			var self = this;
			this.myStack.stack[last].close(this.level + 1, function(){
				self.expand(function(){
					AC.Stack.clickChoice(self.myStack.name, self.master, self.choice);
					self.setCurrentChoice();
				}, true);
			})
		});

		APP.oncl(this, this._title, function(target){
			var last = this.myStack.stack.length - 1;
			if (this.level == last)
				return;
			var self = this;
			this.myStack.stack[last].close(this.level + 1, function(){
				self.expand(function(){
					AC.Stack.clickChoice(self.myStack.name, self.master, self.choice);
					self.setCurrentChoice();
				}, true);
			})
		});

		APP.oncl(this, this._infoBtn, function(){
			var href = "Step" + this.master.type;
			AC.Help.gotoHelp(href);
		});
		
		if (this.choice)
			this.setCurrentChoice(true);
	},
	
	resetOption : function(opt){
		this.choice = opt ? opt.choice : this.myClass.start;
		this.setCurrentChoice();
	},

	setCurrentChoice : function(simple){
		this.myStack.removeCurrentChoice();
		var z = this._menu.find(".acsChoix");
		z.removeClass("acsChoiceSelected");
		z.removeClass("acsTabSel");
		
		if (this.choice) {
			// this._menu.find("[data-choice='" + this.choice + "']").addClass("acsChoiceSelected");
			this.myStack.lastChoice = this._menu.find("[data-choice='" + this.choice + "']");
			if (this.myClass.title)
				this.myStack.lastChoice.addClass("acsTabSel");
			else
				this.myStack.lastChoice.addClass("acsChoiceSelected");
		}
		if (simple)
			return;
		var self = this;
		if (this.isShort)
			this.expand();
		else {
			this.drawSys();
			this.drawWork();
		}
	},
	
	drawSys : function(){
	},
	
	/********* Surchargeable ******************/
	
	previousItem : function(){
		if (this.pos && this.pos.pos != -1 && this.pos.pos > 0)
			this.showIndex(this.pos.pos - 1);		
	},
	
	nextItem : function(){
		if (this.pos && this.pos.pos != -1 && this.pos.pos < this.pos.max -1)
			this.showIndex(this.pos.pos + 1);
	},
	
	showIndex : function(index){
		var lst = this.myParent["a_" + this.myParent.choice];
		if (lst == null || index < 0 || index > lst.length.length - 1)
			return null;
		var m = {}
		var pm = this.master;
		for (f in pm)
			m[f] = pm[f];
		if (this.myParent.nextMasterOfItem) {
			this.myParent.nextMasterOfItem(m, lst[index]);
			this.master = m;
			this.registerMaster(m);
			AC.Req.syncAndDo(this, this.redrawAll);
		}
	},

	setItemPos : function(){
		this.pos = this.myParent ? this.myParent.posOf(this.master) : {pos:-1};
		this._acsNP1N.html(this.pos.pos == -1 ? "" : ("" + (this.pos.pos + 1) + "/" + this.pos.max));
		Util.btnEnable(this._acsNPN, this.pos.pos != -1 && this.pos.pos < this.pos.max -1);
		Util.btnEnable(this._acsNPP, this.pos.pos != -1 && this.pos.pos > 0);
	},
			
	posOf : function(master){
		var lst = this["a_" + this.choice];
		if (!lst || !this.equalItemMaster)
			return {pos:-1, max:0};
		var max = lst.length;
		for(var i = 0; i < max; i++){
			if (this.equalItemMaster(lst[i], master))
				return {pos:i, max:max};
		}
		return {pos:-1, max:max};
	},
	
	redrawAll : function(){
		this.drawHead();
		this.drawMenu();
		if (!this.isShort){
			this.drawSys();
			this.drawWork();
		}
	},
	
	onCellsChange : function(cells){
		this.redrawAll();
		if (this.attached){
			for(var i=0, ch = null; ch = this.attached[i]; i++)
				ch.onCellsChange(cells);
		}
	},

	drawWork : function(){
		this.setItemPos();
	},

	drawHead : function(){
		this._head.html("Master : " + JSON.stringify(this.master));
	},
	
	registerMaster : function(master){
	},
	
	unregisterMaster : function(){
	},
	
	ready : function(){ // apres expand
	},
	
});

/*****************************************************/
AC.Stack("AC.StackG", {
	trTime : 300,
	
	showTarget : function(target){
		var obj = AC.decodeParam(target);
		AC.StackG.show(obj);
	},

	show : function(arg){
		if (!this.current) {
			this.current = new AC.StackG();
			this.current.show(arg, true);
		} else
			this.current.show(arg);
	},
	
	current : null,
	
	bottomClass : "acsBottomG",
	
	html0 : "<div class='bar' id='bar'>"		
		+ "<div class='fermer' id='acPanel2Fermer'>Fermer</div>"
		+ "<div class='printBar' id='printBar'></div>"
		+ "<div class='titre'>Alterconsos et producteurs</div>"
		+ "</div>"
		+ "<div class='acSpace25'></div>"
		+ "<div class='acsBottomXX'>"
		+ "<div class='acsBottomG0' id='page'></div>"
		+ "<div class='filler'></div></div>",
		
	classes : {
		Dir : {
			parent:null,
			title: "Groupes d'alterconsos et Groupements de producteurs",
			ids:[], 
			actions:[],
			start : "lstGac",
			choices : [{ id:"lstGac", libc:"Groupes d'alterconsos", lib: "Afficher la liste des groupes d'alterconsos"
					},{ id: "lstGap", libc:"Groupements de producteurs", lib: "Afficher la liste des groupements de producteurs" }
					]
		},
		Gac : {
			parent: "Dir",
			title: "Groupe d'alterconsos",
			ids: ["gac"],
			actions:[{id:"plusCt", icon:"Plus", lib:"Nouvel alterconso ..."},
			         {id:"exportContacts", icon:"Excel", lib:"Export en Excel ..."}
			         ],
			start : "lstAc",
			choices : [{id:"lstAc", lib:"Afficher la liste des alterconsos"}]
		},
		Ac : {
			parent: "Gac",
			title: "Alterconso",
			ids: ["ac"],
			actions:[{id:"securite", icon:"Cadenas", lib:"Accès / Sécurité ..." },
			         {id:"perso", icon:"Perso", lib:"Données personnelles ..."},
			         {id:"photo", icon:"Photo", lib:"Photo ..."}
			         ],
			choices : []
		},
		Gap : {
			parent: "Dir",
			title: "Groupements de producteurs",
			ids: ["gap"],
			actions:[{id:"plusCt", icon:"Plus", lib:"Ajouter un nouveau producteur"},
			         {id:"exportContacts", icon:"Excel", lib:"Export en Excel ..."}
			         ],
			start: "lstAp",
			choices : [{id:"lstAp", lib:"Afficher la liste des rayons et des producteurs"}]
		},
		Ap : {
			parent: "Gap",
			title: "Producteur",
			ids: ["ap"],
			actions:[{id:"securite", icon:"Cadenas", lib:"Accès / Sécurité ..." },
			         {id:"perso", icon:"Perso", lib:"Données personnelles ..."},
			         {id:"photo", icon:"Photo", lib:"Photo ..."},
			         {id:"produit", icon:"Plus", lib:"Nouveau produit ..."}
			         ],
			start: "lstProd",
			choices : [{id:"lstProd", lib:"Afficher la liste des produits proposés"}]
		},
		Ry : {
			parent: "Gap",
			title: "Rayon",
			ids: ["ry"],
			actions:[],
			start: "lstProd",
			choices : [{id:"lstProd", lib:"Afficher la liste des produits proposés"}]
		},
		Pr : {
			parent: "Ap",
			title: "Produit",
			ids: ["pr", "codeLivr"],
			actions:[{id:"activerProduit", icon:"Plus", lib:"Remettre le produit au catalogue"},
			         {id:"inactiverProduit", icon:"Inactiver", lib:"Retirer le produit du catalogue"}
			         ],
			start: "lstCV",
			choices : [{id:"lstCV", lib:"Afficher la liste des conditions de vente"}]
		},
		
		Pr2 : {
			parent: "Ry",
			title: "Produit",
			ids: ["pr", "codeLivr"],
			actions:[{id:"activerProduit", icon:"Plus", lib:"Remettre le produit au catalogue"},
			         {id:"inactiverProduit", icon:"Inactiver", lib:"Retirer le produit du catalogue"}
			         ],
			start: "lstCV",
			choices : [{id:"lstCV", lib:"Afficher la liste des conditions de vente"}]
		}
	},
	
	close : function(){
		if (this.current)
			this.current.close();
	}
	
},{
	init : function(){
		this.name = "StackG";
		var _cont = APP._acPanel2;
		_cont.html(this.constructor.html0);
		var _page = _cont.find("#page");
		new AC.PrintBox2().init(_cont.find("#printBar"), _page);
		APP.oncl(this, _cont.find("#acPanel2Fermer"), this.close);
		_cont.css("display", "block");
		var self = this;
		setTimeout(function(){
			_cont.css("left", "20%");
		}, 100);
		this._super(_page, this.constructor.classes, this.constructor.bottomClass);
	},
	
	close : function(){
		this._super();
		this.constructor.current = null;
		var _cont = APP._acPanel2;
		var self = this;
		setTimeout(function(){
			_cont.css("left", "120%");
   			setTimeout(function(){
   				_cont.html("");
   				_cont.css("display", "none");
   			}, self.constructor.trTime);
		}, 20);
	}

});

/****************************************************************/
AC.Step("AC.StepDir",{
	masque : true,
},{
	init : function(stack, level, master, callBack){
		AC.Directory.attach(this);
		this._super(stack, level, master, callBack);
		this.name = "StepDir";
	},
	
	nextMasterOfItem : function(master, item){
		if (this.choice == "lstGac")
			master.gac = item.code;
		else
			master.gap = item.code;
	},
	
	equalItemMaster : function(item, master){
		if (this.choice == "lstGac")
			return item.code == master.gac;
		else
			return item.code == master.gap;
	},

	onCellsChange : function(cells){
		this._super(cells);
		this.build_lst();
	},

	regMasque : function(){
		var gx = this.choice == "lstGac" ? "groupes" : "groupements";
		var masque = new AC.CheckBox2(this._work.find("[data-ac-id='masque']"), null, 
		"Voir AUSSI les " + gx + " résiliés");
		masque.val(this.constructor.masque ? false : true);
		var self = this;
		masque.jqCont.off("dataentry").on("dataentry", function(){
			self.constructor.masque = !masque.val();
			self.drawWork();
		});
	},

	drawWork : function(){
		this.type = this.choice == "lstGac" ? 1 : 2;
		this.build_lst();
		var t = new StringBuffer()
		t.append("<div class='acSpace05' data-ac-id='masque'></div>");
		t.append("<div class='acSpace05'>");
		APP.colorPaire = false;
		for ( var i = 0, elt = null; elt = this.a_lstGrp[i]; i++) {
			if (this.constructor.masque && elt.suppr)
				continue;
			t.append("<div data-index='" + elt.code 
				+ "' class='acGrp acsSelectable'><div class='acsSelInner" + APP.altc(elt.color) + "'>")
				.append(Util.editEltHS(elt) + " (" + elt.code + ")</div></div>");
		}
		t.append("</div>");
		this._work.html(t.toString());
		this.regMasque();
		APP.oncl(this, this._work.find(".acGrp"), function(target){
			var code = parseInt(target.attr("data-index"));
			AC.StackG.show({type:["","Gac","Gap"][this.type], gac:code, gap:code})
		});
		this._super();
	},

	drawHead : function(){
	},
	
	build_lst : function(){
		if (this.choice == "lstGac") {
			this.a_lstGac = APP.Ctx.dir.getElements(1);
			this.a_lstGrp = this.a_lstGac;
		} else {
			this.a_lstGap = APP.Ctx.dir.getElements(2);	
			this.a_lstGrp = this.a_lstGap;
		}
	},
	
	registerMaster : function(master){
		this.build_lst();
	},
	
	unregisterMaster : function(){
		AC.Directory.detach(this);
	},
	
	ready : function(){ // apres expand
	}
	
});

/****************************************************************/
AC.Step("AC.StepG1", {
	drawRayons : function(t){
		t.append("<div class='acsTabsRy'>");
		t.append("<div data-index='9' class='acTab acTab6r bold colorRy9'>Tous</div>");
		for(var i = 1; i < 5; i++)
			t.append("<div data-index='" + i + "' class='acTab acTab6r bold colorRy"
				+ i + "'>" + this.rayons[i] + "</div>"); 
		t.append("<div data-index='0' class='acTab acTab6r bold colorRy0'>Autre</div></div><br>");
	},

	rayons : ["Autre", "Boucherie / Charcuterie", "Crémerie", "Fruits et Légumes", "Epicerie"]
	
},{
	init : function(stack, level, master, callBack){
		APP.Ctx.dir.attach(this);
		this._super(stack, level, master, callBack);
	},
	
	unregisterMaster : function(){
		this.cellGrp.detach(this);
		APP.Ctx.dir.detach(this);
	},
	
	registerRayons : function(){
		APP.oncl(this, this._work.find(".acTab"), function(target){
			this.choice = "lstRy";
			var ry = parseInt(target.attr("data-index"), 10);
			AC.StackG.show({type:"Ry", gap:this.grp, ry:ry});
		});
	},
	
	regMasque : function(){
		var masque = new AC.CheckBox2(this._work.find("[data-ac-id='masque']"), null, 
		"Voir AUSSI les produits retirés du catalogue");
		masque.val(this.constructor.masque ? false : true);
		var self = this;
		masque.jqCont.off("dataentry").on("dataentry", function(){
			self.constructor.masque = !masque.val();
			self.drawWork();
		});
	},

	regMasque2 : function(){
		var masque = new AC.CheckBox2(this._work.find("[data-ac-id='masque2']"), null, 
		"Voir AUSSI les " + this.constructor.acap + " résiliés");
		masque.val(this.constructor.masque2 ? false : true);
		var self = this;
		masque.jqCont.off("dataentry").on("dataentry", function(){
			self.constructor.masque2 = !masque.val();
			self.drawWork();
		});
	},

	grpEditS : function(t, g, elt, inner) {
		var conf = elt.confidentialite ? elt.confidentialite : 0;
		if (g.isGAC && (!g.monG() || APP.Ctx.authUsr) && conf == 2)
			return;
		if (!inner)
			t.append("<div data-index='" + elt.code + (g.isGAC ? ("' data-gac='" + g.code) : "") +
					"' class='acContact acsSelectable'><div class='acsSelInner" 
					+ APP.altc(elt.color) + "'>");
		else
			t.append("<div class='acsSelectableF'><div class='acsSelInner color" + elt.color + "'>");
		var url = elt.url ? elt.url : "images/default-64x64.jpg";
		t.append("<img class='acAcapPhoto' src='" + url + "'/>");
		t.append("<div class='acAcapInfo'>");
		t.append("<span class='bold'>" + Util.editEltHS(elt) + "</span>");
		t.append("<span>  [" + elt.initiales + " - "
			+ (elt.adherent ? (elt.adherent + " / ") : "") + elt.code + "]</span>");
		t.append("</div><div class='acEnd'></div></div></div>");
	},
	
	grpEditD : function(t, elt) {
		var conf = elt.confidentialite ? elt.confidentialite : 0;
		var int = this.cellGrp.monG() && (APP.Ctx.authUsr == elt.code || !APP.Ctx.authUsr);
		var r2 = [1, 0, 2][conf];
		if (this.w < 2){
			// pas de droit de sécurité
			var hr = "/app?a" + APP.Ctx.authDir + ".r" + APP.Ctx.authRole + ".g" + APP.Ctx.authGrp + ".u" + APP.Ctx.authUsr; 
			t.append("<div>Vous vous êtes connecté sans mot de passe ce qui ne vous donne pas accès aux fonctions de sécurité (changement de mot de passe...)");
			t.append("<div><a href='" + hr + "'>Pour donner votre mot de passe cliquer ici.</a></div><br></div>");
		}
		if (this.cellGrp.isGAC && conf == 2 && !int) {
			t.append("<div>Alterconso #" + elt.code + " : confidentialité restreinte");
			return;
		}
		t.append("<div>");
		var url = elt.url ? elt.url : "images/default-64x64.jpg";
		t.append("<img class='acPhotoL' src='" + url + "'/>");
//		if (elt.localisation)
//			t.append("<div class='acMapsBtn'></div>");
		t.append("<div class='acInfoS'><span class='acInfoC'>" + elt.nom.escapeHTML() + "</span></div>");
		t.append("<div class='acInfoS'>");
		t.append("<span><i>Initiales : </i>" + elt.initiales + " - </span>");
		if (elt.adherent && this.r >= 1)
			t.append("<span><i>Code Adhérent : </i>" + elt.adherent + " - </span>");
		t.append("<span><i>Code interne : </i>" + elt.code + "</span>");
		t.append(Util.editSuppr2(elt.suppr));
		if (this.type == 2) {
			if (elt.code == 1)
				t.append("<span class='small bold'> - Groupement - </span>");
			if (elt.code > 1 && elt.code < 100)
				t.append("<span class='small bold'> - Payé par le Groupement - </span>");
			if (elt.code >= 100)
				t.append("<span class='small bold'> - Paiement direct - </span>");
			if (elt.code == 1 || elt.code >= 100) {
				t.append("<div><i>Chèques à établir à l'ordre de : </i>" 
					+ (elt.ordreCheque ?  elt.ordreCheque : elt.nom).escapeHTML() + "</div>");
			}
		}
		t.append("<br>");
		if (elt.code == 1 && elt.novol)
			t.append("<div>PAS de gestion des volontaires dans ce groupe</div>");
		if (int) {
			if (elt.code != 1) {
				if (elt.pwd)
					t.append("<div>A un mot de passe</div>");
				else
					t.append("<div>N'a pas de mot de passe</div>");
			}
			if (elt.nomail)
				t.append("<div>A demandé à ne PAS recevoir les e-mails hebdomadaires</div>");
			if (elt.unclic)
				t.append("<div>A des accès en un clic dans les e-mails hebdomadaires</div>");
		}
		t.append("<div>Confidentialité : <i>" 
				+ ["normale", "publique", "restreinte"][conf] + "</i></div>");
		if (elt.localisation && this.r >= r2) {
			// t.append("<div>Localisation : " + elt.localisation.escapeHTML() + "</div>");
			t.append("<div>Localisation : " + Util.adresse(elt.localisation) + "</div>");
		}
		if (elt.postitContact && this.r >= r2)
			t.append("<div class='acPostitContact'>" + elt.postitContact.escapeHTML() + "</div>");
		if (elt.email1 && this.r >= r2)
			t.append("<span><i>e-mails : </i>" + elt.email1+ " ; </span>");
		if (elt.telephones && this.r >= r2)
			t.append("<div><i>téléphones : </i>" + elt.telephones+ " ; </div>");
		if (int && this.r > 1){
			if (elt.ci1) {
				t.append("<div><i>Clé : </i>" + elt.ci1 + ' <i>générée à </i>' 
					+ new Date(elt.dhi1).format('Y-m-d H:i:s') + "</div>");
			}
			if (elt.derniereCotis) {
				if (this.type == 1)
					t.append("<div><i>Dernière cotisation : </i>" 
						+ elt.derniereCotis + " ; </div>");
				else {
					var s = Util.editTaux( elt.derniereCotis);
					t.append("<div><i><b>Contribution aux frais du Groupement&nbsp;:&nbsp;</b></i>");
					t.append(s);
					t.append("</div>");
				}
			}
			if (this.type == 1 && elt.grExcl && elt.grExcl.length) {
				t.append("<div><i>Pas de commande des produits de : </i><b>");
				var xx = [];
				for ( var i = 0, x = 0; x = elt.grExcl[i]; i++)
					xx.push(Util.editEltT2(APP.Ctx.dir.getElement(2, x)).escapeHTML());
				t.append(xx.join(", ")).append("</b></div>");
			}
		}
		if (this.type == 1 && elt.groupements && elt.groupements.length) {
			t.append("<div><i>Correspondant des groupements : </i><b>");
			var xx = [];
			for ( var i = 0, x = 0; x = elt.groupements[i]; i++)
				xx.push(Util.editEltT2(APP.Ctx.dir.getElement(2, x)).escapeHTML());
			t.append(xx.join(", ")).append("</b></div>");
		}
		t.append("</div><div class='acEnd'></div></div>");
	},
	
	avertissement : function(t, grp){
		var livr = APP.Ctx.curLivrs ? APP.Ctx.curLivrs[grp] : 0;
		var x = APP.Ctx.authGac ? " pour ce groupement" : "";
		var x2 = " <br>Voir toutes les conditions appliquées à toutes les "
			+ "livraisons en cliquant sur le produit voulu.</div>"
		if (livr) {
			var d = livr.expedition;
			if (APP.Ctx.authGac) {
				var sl = livr.slivrs[APP.Ctx.authGac];
				d = APP.Ctx.authUsr ? sl.distrib : sl.dlivr;
			}
			d = AC.AMJ.dateLongue(d);
			t.append("<div class='avert'>");
			t.append("Les conditions de vente (prix, disponibilité ...) ci-après sont celles "
				+ " qui s'appliquent à la dernière livraison choisie" + x + ", celle du "
				+ "<span class='red'>" + d + ".</span>" + x2);			
		} else {
			t.append("<div class='avert'><span class='red'>Aucune livraison n'ayant déjà été choisie"
				+ x + "</span>, ");
			t.append("les conditions de vente (prix, disponibilité ...) ci-après sont celles dites "
				+ " <span class='red'>de référence</span> qui s'appliqueront peut-être "
				+ "à une livraison future." + x2);
		}
	},
	
	produitEditS : function(t, grp, p, inner, parRy, elt){
		var livr = APP.Ctx.curLivrs ? APP.Ctx.curLivrs[grp] : 0;
		var x = this.cellGrp.get(p.ap);
		var xi = x ? x.initiales : "#" + p.ap;
		var cl = "<span class='colorRy" + p.rayon + " marg2'>" + "ABCFE".charAt(p.rayon) + "</span>";
		var ini = parRy ? " [" + xi + "] " : "";
		if (!inner) {
			var obj = AC.encodeParam({type:parRy ? "Pr2" : "Pr", gap:grp, pr:p.pr, ry:p.rayon,	
					ap:p.ap, codeLivr:this.codeLivr});
			t.append("<div class='acPr acsSelectable'" + obj + ">");
			t.append("<div class='acsSelInner" + APP.altc(elt ? elt.color : 16) + "'>");
		} else
			t.append("<div class='acsSelInner'>");
		t.append("<span class='bold'>" + cl + p.nom.escapeHTML() + ini + "</span>");
		t.append("<span> [" + 
			["","Prix Fixe","Pré emballé","Vrac"][p.type] + "</span>");
		t.append("<span class='small bold'> / " + (p.pr + (p.ap * 10000)) + "]</span>");
		if (p.suppr)
			t.append("<span class='bold red'> - Annulé le " + p.suppr + "</span>");
		if (p.parDemi)
			t.append("<span class='acParDemi'> - Commandable par DEMI</span>");
		if (p.cond)
			t.append("<span> - " + p.cond.escapeHTML() + "</span>");
		if (p.bio)
			t.append("<span> - " + p.bio.escapeHTML() + "</span>");				
		if (p.froid)
			t.append("<span> - Froid</span>");				
		if (p.poidsemb)
			t.append("<span> - (Emb. +" + p.poidsemb + "%)</span>");				
		if (p.postit)
			t.append("<div class='italic'>" + p.postit.escapeHTML() + "</div>");
		if (!inner) {
			var codeLivr = livr ? livr.codeLivr : 0;
			var prix = this.cellCtlg ? this.cellCtlg.getPrix(p.ap, p.pr, codeLivr) : null;
			if (prix){
				var z = p.type != 1 ? "/Kg" : "";
				var y = ["", "Poids brut: ", "Poids moyen: ", "Livrable par: "][p.type];
				t.append("<div>");
				
				if (livr && !APP.Ctx.authUsr && APP.Ctx.loginGap) {
					var d = livr.expedition;
					var lb = (prix.dispo ? "Retirer" : "Ajouter" ) + " à " + AC.AMJ.dateTCourte(d);
					var par = AC.encodeParam({gap:grp, pr:p.pr, ap:p.ap, codeLivr:codeLivr, dispo:prix.dispo});
					t.append("<div class='action action7'").append(par).append(">").append(lb).append("</div>");
				}
				
			    t.append("<img class='acf-pic3' src='images/dispo" + (prix.dispo ? prix.dispo : 0) + ".png'></img>");
				t.append("<span>" + INT.editE(prix.pu) + z + "; </span>");
				t.append("<span>" + y + INT.editKg(prix.poids) + "</span>");
				if (prix.qmax)
					t.append("<span>; Alerte à " + prix.qmax + "</span>");
				if (prix.parite)
					t.append("<span>; Cmd groupe par x2</span>");
				if (prix.gacExcl && prix.gacExcl.length != 0){
					t.append("<div><i>Non livrable à : </i>");
					for(var k = 0, g = 0; g = prix.gacExcl[k]; k++)
						t.append(k != 0 ? ", " : "").append(Util.editEltHS(APP.Ctx.dir.getElement(1, g)));
					t.append("</div>");
				}
				t.append("</div>");	
			}
		}
		t.append("</div>");
		if (!inner)
			t.append("</div>");
	},

	ajouterRetirer : function(target) {
		var obj = AC.decodeParam(target);
		var arg = this.cvHasChanged ? this.changedPrix : {};
		arg.op = "11";
		arg.gap = obj.gap;
		arg.apr = obj.ap;
		arg.pr = obj.pr;
		arg.codeLivr = obj.codeLivr;
		arg.dispo = obj.dispo ? 0 : 2;		
		arg.operation = "Mise à jour du produit";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info(arg.operation + " : faite");
			setTimeout(function() {
				AC.Req.sync(); // Dans function, sinon this est Window
			} , 5000); // MAJ prix asynchrone sur le serveur !!!
		}, "Echec de la mise à jour : ");
	},

	hasAction_plusCt : function(){
		return !APP.Ctx.authUsr && this.w > 2;
	},

	action_plusCt : function(){
		new AC.NouveauContact(this.cellGrp);
	},

	hasAction_exportContacts : function(){
		return !APP.Ctx.authUsr && this.w > 2;
	},

	action_exportContacts : function(){
		AC.Req.submitForm("59", "alterconsos/export/AC_" 
				+ (APP.Ctx.authType == 1 ? " Alterconsos.xls" : "Producteurs.xls"));
	},

	action_securite : function(){ // AC ou AP
		new AC.FormSecurite(this.cellGrp, this.ac || this.ap);
	},

	hasAction_securite : function(){
		if (APP.Ctx.authUsr > 1)
			return this.w >= 2;
		return APP.Ctx.authUsr ? (this.w > 2) : this.grw;
	},

	action_perso : function(){
		new AC.FormContactS(this.cellGrp, this.elt, this.w);
	},

	action_photo : function(){
		new AC.FormPhoto2(this.cellGrp, this.ac || this.ap);
	},

})

/****************************************************************/
AC.StepG1("AC.StepGac",{
	masque2 : true,
	acap : "alterconsos",
},{
	init : function(stack, level, master, callBack){
		this._super(stack, level, master, callBack);
		this.name = "StepGac";
	},
	
	nextMasterOfItem : function(master, item){
		master.ac = item.code;
	},
	
	equalItemMaster : function(item, master){
		return item.code == master.ac;
	},

	build_lst : function(){
		this.a_lstAc = this.cellGrp.getAllContacts();
	},
	
	drawWork : function(){
		this.build_lst();
		var t = new StringBuffer();
		t.append("<div class='acSpace05' data-ac-id='masque2'></div>");
		t.append("<div class='acSpace05'>");
		t.append("<div class='color" + this.cellGrp.get(1).color + "'>");
		t.append("<div class='acSpace05'>");
		var g = this.cellGrp;
		var self = this;
		if (!this.elt.pwd)
			t.append("<div class='italic'>N'a aucun de mot de passe</div><br>");
		else {
			if (!this.elt.pwd2)
				t.append("<div class='italic'>A un mot de passe principal mais pas de secondaires</div><br>");
			else
				t.append("<div class='italic'>A des mots de passe principal et secondaires</div><br>");
		}
		if (APP.Ctx.currentMode == 1){
			t.append("<div class='bold italic'>Correspondants :</div><br>");
			var code = APP.Ctx.loginGap.code;
			APP.colorPaire = false;
			g.forAllContacts(function(elt) {
				if (elt.groupements && elt.groupements.indexOf(code) != -1)
					self.grpEditS(t, g, elt);
			});
			t.append("<br><div class='bold italic'>Alterconsos :</div><br>");
		}
		
		APP.colorPaire = false;
		
		g.forAllContacts(function(elt) {
			if (self.constructor.masque2 && elt.suppr)
				return;
			self.grpEditS(t, g, elt);
		});
		
		t.append("</div></div>");
		this._work.html(t.toString());
		this.regMasque2();
		APP.oncl(this, this._work.find(".acContact"), function(target){
			var code = parseInt(target.attr("data-index"));
			AC.StackG.show({type:"Ac", gac:this.grp, ac:code})
		});
		this._super();
	},

	drawHead : function(){
		this.setTitle("Groupe d'alterconsos : " + this.elt.label);
	},
	
	onCellsChange : function(cells){
		this.elt = APP.Ctx.dir.getElement(1, this.grp, true);
		this.rw = this.cellGrp.monG() && !this.cellGrp.isSuppr() && APP.Ctx.currentMode < 3;
		this.w = this.rw ? 3 : 0;
		this._super(cells);
		this.build_lst();
	},

	registerMaster : function(master){
		this.type = 1;
		this.grp = master.gac;
		this.elt = APP.Ctx.dir.getElement(1, this.grp, true);
		if (this.cellGrp)
			this.cellGrp.detach(this);
		this.cellGrp = AC.GAC.getN(this.grp);
		this.rw = this.cellGrp.monG() && !this.cellGrp.isSuppr() && APP.Ctx.currentMode < 3;
		this.w = this.rw ? 3 : 0;
		this.cellGrp.attach(this);
		this.build_lst();
	}
	
});

/****************************************************************/
AC.StepG1("AC.StepGap",{
	masque2 : true,
	acap : "producteurs",
},{
	init : function(stack, level, master, callBack){
		this._super(stack, level, master, callBack);
		this.name = "StepGap";
	},
	
	nextMasterOfItem : function(master, item){
		if (this.choice == "lstAp")
			master.ap = item.code;
		else
			master.ry = item;
	},
	
	equalItemMaster : function(item, master){
		if (this.choice == "lstAp")
			return item.code == master.ap;
		else
			return master.ry == item;
	},

	build_lst : function(){
		this.a_lstAp = this.cellGrp.getAllContacts();
		this.a_lstRy = [1,2,3,4,0];
	},

	drawWork : function(){
		this.build_lst();
		var t = new StringBuffer();
		t.append("<div class='acSpace05' data-ac-id='masque2'></div>");
		t.append("<div class='acSpace05'>");

		t.append("<div class='color" + this.cellGrp.get(1).color + "'>");
		var g = this.cellGrp;
		var self = this;
		
		this.constructor.drawRayons(t);
		
		APP.colorPaire = false;
		if (APP.Ctx.currentMode > 1){
			var gx = APP.Ctx.loginGac;
			var x1 = false;
			gx.forAllContacts(function(elt) {
				if (elt.groupements && elt.groupements.indexOf(self.grp) != -1) {
					if (!x1){
						t.append("<div>Alterconsos correspondants :</div>");
						x1 = true;
					}
					self.grpEditS(t, gx, elt, gx.isMonAcAp(elt.code) && !gx.isSuppr());
				}
			});
			if (x1)
				t.append("<br><div>Producteurs :</div><br>");
		}
		
		APP.colorPaire = false;
		g.forAllContacts(function(elt) {
			if (self.constructor.masque2 && elt.suppr)
				return;
			self.grpEditS(t, g, elt);
		});
		t.append("</div>");
		this._work.html(t.toString());
		this.regMasque2();
		
		APP.oncl(this, this._work.find(".acContact"), function(target){
			this.choice = "lstAp";
			var code = parseInt(target.attr("data-index"));
			var gac = target.attr("data-gac");
			if (gac)
				AC.StackG.show({type:"Ac", gac:parseInt(gac, 10), ac:code});
			else
				AC.StackG.show({type:"Ap", gap:this.grp, ap:code});
		});
		this.registerRayons();
		this._super();
	},

	drawHead : function(){
		this.setTitle("Groupements de producteurs : " + this.elt.label);
	},
	
	onCellsChange : function(cells){
		this.elt = APP.Ctx.dir.getElement(2, this.grp, true);
		this.rw = this.cellGrp.monG() && !this.cellGrp.isSuppr() && APP.Ctx.currentMode < 3;
		this.w = this.rw ? 3 : 0;
		this._super(cells);
		this.build_lst();
	},

	registerMaster : function(master){
		this.type = 2;
		this.grp = master.gap;
		this.elt = APP.Ctx.dir.getElement(2, this.grp, true);
		if (this.cellGrp)
			this.cellGrp.detach(this);
		this.cellGrp = AC.GAP.getN(this.grp);
		this.rw = this.cellGrp.monG() && !this.cellGrp.isSuppr() && APP.Ctx.currentMode < 3;
		this.w = this.rw ? 3 : 0;
		this.cellGrp.attach(this);
		this.build_lst();
	}
	
});

/****************************************************************/
AC.StepG1("AC.StepAc",{
	
},{
	init : function(stack, level, master, callBack){
		this._super(stack, level, master, callBack);
		this.name = "StepAc";
	},
	
	drawWork : function(){
		var t = new StringBuffer();
		t.append("<div class='color" + this.elt.color + "'>");
		t.append("<div class='acSpace05'>");
		this.grpEditD(t, this.elt);
		t.append("</div></div>");
		this._work.html(t.toString());
//		if (this.elt.localisation)
//			AC.oncl(this, this._work.find(".acMapsBtn"), function(target){
//				new AC.Maps().init(this.elt);
//			});
		this._super();
	},

	drawHead : function(){
		this.setTitle("Alterconso : " + this.elt.nom);
	},
	
	onCellsChange : function(cells){
		this.elt = this.cellGrp.getContact(this.ac);
		this.w = this.cellGrp.wLvl(this.ac);
		this.r = this.cellGrp.rLvl(this.ac);
		this.grw = this.cellGrp.monG() && !this.cellGrp.isSuppr() && APP.Ctx.currentMode < 3;
		this._super(cells);
	},

	registerMaster : function(master){
		this.type = 1;
		this.grp = master.gac;
		this.ac = master.ac;
		this.cellGrp = AC.GAC.getN(this.grp);
		this.cellGrp.attach(this);
		this.elt = this.cellGrp.getContact(this.ac);
		// Aucun:0 Usr:1 Usr+:2 Anim:3
		this.w = this.cellGrp.wLvl(this.ac);
		// peut lire: 0:pub 1:restr 2:priv
		this.r = this.cellGrp.rLvl(this.ac);
		this.grw = this.cellGrp.monG() && !this.cellGrp.isSuppr() && APP.Ctx.currentMode < 3;
	},
		
	hasAction_chgPwdCt : function() { return this.w > 1; },
	hasAction_gencle : function() { return this.w > 0; },
	hasAction_photo : function() { return this.w > 0; },
	hasAction_perso : function() { return this.w > 0; },
	hasAction_activer : function() { return this.elt.suppr && this.w > 2; },
	hasAction_inactiver : function() { return !this.elt.suppr && this.w > 2; }
	
});

/****************************************************************/
AC.StepG1("AC.StepAp",{
	masque : true,
},{
	init : function(stack, level, master, callBack){
		this._super(stack, level, master, callBack);
		this.name = "StepAp";
	},

	nextMasterOfItem : function(master, item){
		master.ap = item.ap;
		master.ry = item.rayon;
		master.pr = item.pr;
	},
	
	equalItemMaster : function(item, master){
		return item.pr == master.pr && item.ap == master.ap;
	},

	build_lstProd : function(){
		this.a_lstProd = this.cellCtlg.lstProduits(this.ap, this.constructor.masque);
		this.a_lstProd.sort(AC.Sort.n);		
	},

	drawWork : function(){
		this.build_lstProd();
		var t = new StringBuffer();
		t.append("<div class='color" + this.elt.color + "'>");
		t.append("<div class='acSpace05'>");
		this.grpEditD(t, this.elt);
		t.append("</div>");

		t.append("<div class='acSpace05' data-ac-id='masque'></div>");
		
		if (this.a_lstProd.length == 0){
			t.append("<div class='italic'>Aucun produit au catalogue</div>");
		} else {
			this.avertissement(t, this.grp);
			APP.colorPaire = false;
			for(var i = 0, p = null; p = this.a_lstProd[i]; i++)
				this.produitEditS(t, this.grp, p, null, null, this.elt);
		}
		t.append("</div></div>");
		this._work.html(t.toString());
		this.regMasque();
		APP.oncl(AC.StackG, this._work.find(".acsSelectable"), AC.StackG.showTarget);
		APP.oncl(this, this._work.find(".action7"), this.ajouterRetirer);
//		if (this.elt.localisation)
//			AC.oncl(this, this._work.find(".acMapsBtn"), function(target){
//				new AC.Maps().init(this.elt);
//			});
		this._super();
		this.drawHead();
	},
	
	drawHead : function(){
		this.build_lstProd();
		var n = this.a_lstProd.length;
		var nb = !n ? "" : (n == 1 ? " - 1 produit" : " - " + n + " produits");
		this.setTitle("Producteur : " + this.elt.nom + nb);
	},
	
	onCellsChange : function(cells){
		this.elt = this.cellGrp.getContact(this.ap);
		this.w = this.cellGrp.wLvl(this.ap);
		this.r = this.cellGrp.rLvl(this.ap);
		this.grw = this.cellGrp.monG() && !this.cellGrp.isSuppr() && APP.Ctx.currentMode < 3;
		this._super(cells);
		this.build_lstProd();
	},

	unregisterMaster : function(){
		this.cellCtlg.detach(this);
		this._super();
	},

	registerMaster : function(master){
		this.grp = master.gap;
		this.ap = master.ap;
		this.codeLivr = 0; // pour le lien vers un produit
		this.cellGrp = AC.GAP.getN(this.grp);
		this.cellGrp.attach(this);
		this.cellCtlg = AC.Catalogue.getN(this.grp);
		this.cellCtlg.attach(this);
		this.elt = this.cellGrp.getContact(this.ap);
		// Aucun:0 Usr:1 Usr+:2 Anim:3
		this.w = this.cellGrp.wLvl(this.ap);
		// peut lire: 0:pub 1:restr 2:priv
		this.r = this.cellGrp.rLvl(this.ap);
		this.grw = this.cellGrp.monG() && !this.cellGrp.isSuppr() && APP.Ctx.currentMode < 3;
		this.build_lstProd();
	},
		
	action_produit : function(){
		new AC.NouveauProduit2(this.cellGrp, this.ap);
	},

	hasAction_chgPwdCt : function() { return this.w > 1; },
	hasAction_gencle : function() { return this.w > 0; },
	hasAction_photo : function() { return this.w > 0; },
	hasAction_perso : function() { return this.w > 0; },
	hasAction_activer : function() { return this.elt.suppr && this.w > 2; },
	hasAction_inactiver : function() { return !this.elt.suppr && this.w > 2; },
	hasAction_produit : function() { return !this.elt.suppr && this.w > 1; }
	
});

/****************************************************************/
AC.StepG1("AC.StepRy",{
	ryn : function(a, b) { 
		var au = (a.rayon ? "" + a.rayon : "9") + a.nom.toUpperCase();
		var bu = (b.rayon ? "" + b.rayon : "9") + b.nom.toUpperCase();
		return (au < bu) ? -1 : (au > bu ? 1 : 0);	
	},
	masque : true,
},{
	init : function(stack, level, master, callBack){
		this._super(stack, level, master, callBack);
		this.name = "StepRy";
	},
	
	nextMasterOfItem : function(master, item){
		master.ap = item.ap;
		master.ry = item.rayon;
		master.pr = item.pr;
	},
	
	equalItemMaster : function(item, master){
		return item.pr == master.pr && item.ap == master.ap;
	},

	build_lstProd : function(){
		this.rayon = this.master.ry;
		if (this.master.ry == 9)
			this.a_lstProd = this.cellCtlg.tous(this.constructor.masque);
		else
			this.a_lstProd = this.cellCtlg.rayons(this.rayon, this.constructor.masque);
		this.a_lstProd.sort(this.constructor.ryn);		
	},
	
	drawWork : function(){
		this.build_lstProd();
		var t = new StringBuffer();
		t.append("<div class='acSpace05' data-ac-id='masque'></div>");
		t.append("<div class='acSpace05'>");
		if (this.a_lstProd.length == 0){
			t.append("<div class='italic'>Aucun produit dans ce rayon</div>");
		} else {
			this.avertissement(t, this.grp);
			APP.colorPaire = false;
			for(var i = 0, p = null; p = this.a_lstProd[i]; i++)
				this.produitEditS(t, this.grp, p, false, true);
		}
		t.append("</div>");
		this._work.html(t.toString());
		this.regMasque();
		APP.oncl(AC.StackG, this._work.find(".acsSelectable"), AC.StackG.showTarget);
		APP.oncl(this, this._work.find(".action7"), this.ajouterRetirer);
		this._super();
		this.drawHead();
	},

	drawHead : function(){
		this.build_lstProd();
		var n = this.a_lstProd.length;
		var nb = !n ? "" : (n == 1 ? " - 1 produit" : " - " + n + " produits");
		if (this.master.ry == 9)
			this.setTitle("Tous rayons" + nb);
		else
			this.setTitle("Rayon : " + this.constructor.rayons[this.master.ry] + nb);
	},
		
	onCellsChange : function(cells){
		this._super(cells);
		this.build_lstProd();
	},
	
	unregisterMaster : function(){
		this.cellCtlg.detach(this);
		this._super();
	},

	registerMaster : function(master){
		this.grp = master.gap;
		this.codeLivr = 0; // pour le lien vers un produit
		this.cellGrp = AC.GAP.getN(this.grp);
		this.cellGrp.attach(this);
		this.cellCtlg = AC.Catalogue.getN(this.grp);
		this.cellCtlg.attach(this);
	}
			
});

/****************************************************************/
AC.StepG1("AC.StepPr",{
	
},{
	init : function(stack, level, master, callBack){
		this._super(stack, level, master, callBack);
		this.name = "StepPr";
	},
	
	drawWork : function(){
		var sb = new StringBuffer();
		if (this.w)
			sb.append("<div class='acSpace05 bold italic orange'>Pour modifier la description du produit "
					+ "ou ses conditions de vente, cliquer sur la "
					+ "livraison souhaitée ou sur \"Référence\"<br>"
					+ "Pour recopier une livraison sur une ou plusieurs autres, cliquer "
					+ "sur celle à recopier</div>");
		sb.append(this.listCVEditS2());
		this._work.html(sb.toString());
		if (this.w)
			APP.oncl(this, this._work.find(".codeLivrBtn"), function(target){
				new AC.FormPrixS2B(this, Util.dataIndex(target));
			});
		this._super();
	},

	drawHead : function(){
		this.setTitle("Produit : " + this.produit.nom);
		var t = new StringBuffer();
		this.produitEditS(t, this.grp, this.produit, true);
		this._head.html(t.toString());
	},
	
	onCellsChange : function(cells){
		this.setProd();
		this._super(cells);
	},
	
	unregisterMaster : function(){
		this.cellCtlg.detach(this);
		this._super();
	},

	setProd : function(){
		this.produit = this.cellCtlg.getProduit(this.ap, this.pr);
		this.listCVS2 = this.cellCtlg.getListCVS2(this.ap, this.pr);
		// Aucun:0 Usr:1 Usr+:2 Anim:3
		this.w = this.cellGrp.wLvl(this.ap);
	},
	
	registerMaster : function(master){
		this.grp = master.gap;
		this.ap = master.ap;
		this.pr = master.pr;
		this.codeLivr = master.codeLivr;
		this.rayon = master.ry;
		this.cellGrp = AC.GAP.getN(this.grp);
		this.cellGrp.attach(this);
		this.cellCtlg = AC.Catalogue.getN(this.grp);
		this.cellCtlg.attach(this);
		this.setProd();
	},
	
	listCVEditS2 : function(myCL, selected, ref){
		var codeLivr = APP.Ctx.curLivrs && APP.Ctx.curLivrs[this.grp] ? APP.Ctx.curLivrs[this.grp].codeLivr : 0;
		var cvs = this.listCVS2.cvs;
		var lvs = this.listCVS2.lvs;

		// x expedition dispo pu poids qmax parite dhChange gacExclS
		var tb = new AC.Table(9, true, true, [3,0,0,2,2,0,0,3,3]);
		tb.clazz("inverse bold italique");
		tb.row("Expédition", "#", "Dispo", "Prix", "Poids", "Qmax", "par 2", "Modifiée à", "Non livrable à");
		var arch = false;
		this.expann = null;
		
		for(var i = 0, lv = null; lv = lvs[i]; i++){
			var prix = cvs[lv.icv];
			var isSelected = selected && ref && selected.indexOf(lv.codeLivr) != -1;
			
			if ((lv.arch && myCL != undefined) || (lv.codeLivr == myCL))
				continue;
			if (codeLivr && lv.codeLivr == codeLivr)
				tb.clazz("bgyellow");
			if (lv.codeLivr == 0){
				if (this.w)
					var exped = "<div class='codeLivr codeLivrBtn bold' data-index='0' data-ilv='" + i 
						+ "'>Référence</div>";
				else
					var exped = "<div class='bold'>Référence</div>";
			} else {
				var exp = AC.AMJ.dateMCourte(lv.expedition);
				if (lv.suppr)
					exp += "<span class='orange'> suppr</span>";
				if (!lv.arch) {
					var exped = "<div class='bold " + (this.w ? "codeLivr codeLivrBtn" : "") 
						+ "' data-index='"	+ lv.codeLivr 
						+ "' data-ilv='" + i + "'>" + exp + "</div>";
					if (prix.dispo) this.expann = exp; 
				} else {
					if (!arch) {
						tb.space();
						arch = true;
					}
					var exped = "<div>" + exp + "</div>";
				}
			}
			
			// dates selectionnees
			var xdispo = !isSelected ? prix.dispo : ref.dispo;
			var xpu = !isSelected ? prix.pu : ref.pu;
			var xpoids = !isSelected ? prix.poids : ref.poids;
			var xqmax = !isSelected ? prix.qmax : ref.qmax;
			var xparite = !isSelected ? prix.parite : ref.parite;
			var xdhChange = !isSelected ? prix.dhChange : "maintenant";
			var xgacExclS = !isSelected ? prix.gacExclS : ref.gacExclS;
		    var dispo = "<img class='acf-pic2' src='images/dispo" + (xdispo ? xdispo : 0) + ".png'></img>";
		    
		    tb.row(exped, lv.icv + 1, dispo, INT.editE(xpu), INT.editKg(xpoids),
		    		(xqmax ? xqmax : ""), xparite ? "par 2" : "", xdhChange, xgacExclS);
		}
		return tb.flush();
	},

	action_formProduit : function(){
		new AC.FormProduitS(this.grp, this.produit);
	},

	action_activerProduit : function() {
		this.action_inactiverProduit();
	},
	
	action_inactiverProduit : function() {
		if (!this.produit.suppr && this.expann){
			alert("Pour annuler un produit il faut que le produit soit INDISPONIBLE " +
					"pour toutes les livraisons NON ARCHIVEES. Ce n'est pas le cas pour celle du " + this.expann);
			return;
		}
		if (this.produit.suppr) {
			var cmd = "14";
			var op = "Réactivation";
		} else {
			var cmd = "13"
			var op = "Inactivation";
		}
		var arg = {op:cmd};
		arg.gap = this.grp;
		arg.apr = this.produit.ap;
		arg.pr = this.produit.pr;
		arg.operation = op + " du produit";
		AC.Req.post(this, "alterconsos", arg, op + " faite", op + " en échec : ");
	},
	
	hasAction_activerProduit : function(){ return this.produit.suppr && this.w; },
	hasAction_inactiverProduit : function(){ return !this.produit.suppr && this.w; },
	hasAction_formProduit : function(){ return this.w; }
			
});

AC.StepPr("AC.StepPr2",{
	
},{
	init : function(stack, level, master, callBack){
		this._super(stack, level, master, callBack);
		this.parRy = true;
		this.name = "StepPr";
	}
});
/****************************************************************/
