AC.MasterDir = function(){
	this._content = APP._bottom;
	this.dir = APP.Ctx.master;
	this.dir.attach(this);
	AC.Page.prototype.init.call(this, "annuaire");
}

AC.MasterDir._static = {
}

AC.MasterDir._proto = {
	close : function(){
		this.dir.detach(this);
		AC.Page.prototype.close.call(this);
	},
	
	onCellsChange : function(cells) {
		this.display();
	},
	
	open : function(){
		AC.Page.prototype.open.call(this);
		this.display();
		AC.Req.sync();
	},
	
	display : function(){
		var sb = new StringBuffer();
		sb.append("<div class='btnBox'>")
		sb.append("<div id='newbtn' class='action'>Création d'un nouvel annuaire ...</div>");
		sb.append("<div id='updbtn' class='action'>Renommer l'annuaire des annuaires ...</div></div>");
		sb.append("<div class='large bold italic orange acSpace2'>Liste des annuaires</div>");
		var elts = this.dir.getElements(0);
		for(var i = 0, x = null; x = elts[i]; i++){
			sb.append("<div class='acSpace1B color" + x.color + "'>");
			sb.append("<div class='bold large'>" + x.initiales + " - " + x.label.escapeHTML() + "</div>");
			if (x.suppr)
				sb.append("<div class='bold red'>Supprimé le " + AC.AMJ.dateCourte(x.suppr) + "</div>");
			if (x.postit)
				sb.append("<div class='italic'>" + x.postit.escapeHTML() + "</div>");
			if (x.code) {
				sb.append("<div class='btnBox' data-index='" + x.code + 
						"'><div class='action razbtn'>Remise à \"0000\" du mot de passe</div>");
				if (!x.suppr)
					sb.append("<div class='action desactbtn'>Désactivation</div>");
				else
					sb.append("<div class='action actbtn'>Réactivation</div>");
				sb.append("</div>");
			}
			sb.append("</div>");
		}
		this._content.html(sb.toString());
		AC.oncl(this, this._content.find("#newbtn"), function(target){
			new AC.NewDirGrp(this.dir, 0);
		});
		AC.oncl(this, this._content.find("#updbtn"), function(target){
			new AC.UpdateDir(this.dir, 0);
		});
		AC.oncl(this, this._content.find(".razbtn"), this.razbtn);
		AC.oncl(this, this._content.find(".desactbtn"), this.desactbtn);
		AC.oncl(this, this._content.find(".actbtn"), this.actbtn);
	},
	
	razbtn : function(target){
		var arg = {op: "73"};
		arg.code = Util.dataIndex(target);
		arg.type = 0;
		arg.operation = "Remise à \"0000\" du mot de passe ";
		AC.Req.post(this, "alterconsos", arg, "Remise à \"0000\" du mot de passe faite",
			"Echec de la remise à \"0000\"");
	},
	
	desactbtn : function(target){
		var arg = {op: "72"};
		arg.code = Util.dataIndex(target);
		arg.type = 0;
		arg.operation = "Désactivation de l'annuaire ";
		AC.Req.post(this, "alterconsos", arg, "Désactivation de l'annuaire faite",
			"Echec de la désactivation de l'annuaire");		
	},
	
	actbtn : function(target){
		var arg = {op: "71"};
		arg.code = Util.dataIndex(target);
		arg.type = 0;
		arg.operation = "Réactivation de l'annuaire ";
		AC.Req.post(this, "alterconsos", arg, "Réactivation de l'annuaire faite",
			"Echec de la dréactivation de l'annuaire");		
	}
	
}

AC.declare(AC.MasterDir, AC.Page);

/** ************************************************* */
AC.LocalDir = function(){
	this._content = APP._bottom;
	this.dir = APP.Ctx.dir;
	this.elt = this.dir.getElement(0, APP.Ctx.authDir);
	this.dir.attach(this);
	this.statsMail = AC.StatsMail.getN();
	this.statsMail.attach(this);
	AC.Page.prototype.init.call(this, "annuaire");
}
AC.LocalDir._static = {
}
AC.LocalDir._proto = {
	close : function(){
		this.dir.detach(this);
		this.statsMail.detach(this);
		AC.Page.prototype.close.call(this);
	},
	
	onCellsChange : function(cells) {
		this.display();
	},
	
	open : function(){
		AC.Page.prototype.open.call(this);
		this.display();
		AC.Req.sync();
	},
	
	display : function(){
		var sb = new StringBuffer();
		
		sb.append("<div class='acSpace1B color" + this.elt.color + "'>");
		sb.append("<div class='bold large'>" + this.elt.initiales + " - " + this.elt.label.escapeHTML() + "</div>");
		if (this.elt.suppr)
			sb.append("<div class='bold red'>Supprimé le " + AC.AMJ.dateCourte(this.elt.suppr) + "</div>");
		if (this.elt.postit)
		sb.append("<div class='italic'>" + this.elt.postit.escapeHTML() + "</div>");
		sb.append("<div class='btnBox' data-index='" + this.elt.code + 
				"'><div id='pwdbtn' class='action'>Redéfinir le mot de passe</div>");
		sb.append("<div id='updbtn' class='action'>Mettre à jour la description</div>");
		sb.append("</div>");
		sb.append("</div>");

		sb.append("<div class='acSpace2 bold'>Recherche des alterconsos / producteurs ayant "
				+ "une adresse e-mail contenant la chaîne de caractères \"Filtre\" ci-dessous :</div>");
		sb.append("<div>Filtre&nbsp;:&nbsp;<input id='inputfilter' type='text' style='width:30rem;'>"
				+ "<div id='searchmails' class='action'>Rechercher</div></div>");
		sb.append("<textarea id='resmails' style='width:50rem'></textarea>");
		
		sb.append("<div class='large bold italic orange acSpace2'>Liste des groupes</div>");
		sb.append("<div class='acSpace2 btnBox'>")
		sb.append("<div id='new1btn' class='action'>Création d'un nouveau groupe ...</div>");
		sb.append("<div id='imp1btn' class='action'>Référencer dans cet annuaire un groupe existant ...</div></div>");
		var elts = this.dir.getElements(1);
		var n = this.displayGrps(sb, elts, 1);
		if (n != 0){
			sb.append("<div class='acSpace1 bold italic'>Groupes référencés récemment et qui ne le sont plus :</div>")
			this.displayRemovedGrps(sb, elts, 1);
		}
		
		sb.append("<div class='large bold italic orange acSpace2'>Liste des groupements</div>");
		sb.append("<div class='acSpace2 btnBox'>")
		sb.append("<div id='new2btn' class='action'>Création d'un nouveau groupement ...</div>");
		sb.append("<div id='imp2btn' class='action'>Référencer dans cet annuaire un groupement existant ...</div></div>");
		elts = this.dir.getElements(2);
		n = this.displayGrps(sb, elts, 2);
		if (n != 0){
			sb.append("<div class='acSpace1 bold italic'>Groupements référencés récemment et qui ne le sont plus :</div>")
			this.displayRemovedGrps(sb, elts, 2);
		}
		
		sb.append("<div class='acSpace2 bold large orange'>Statistique des derniers lots de messages envoyés</div>");
		sb.append(this.statsMail.edit());

		this._content.html(sb.toString());
		
		AC.oncl(this, this._content.find("#updbtn"), function(target){
			new AC.UpdateDir(this.dir, APP.Ctx.authDir);
		});
		AC.oncl(this, this._content.find("#pwdbtn"), function(target){
			new AC.PwdDir(this.dir, APP.Ctx.authDir);
		});
		AC.oncl(this, this._content.find("#new1btn"), function(target){
			new AC.NewDirGrp(this.dir, 1);
		});
		AC.oncl(this, this._content.find("#imp1btn"), function(target){
			new AC.ImpGrp(this.dir, 1);
		});
		AC.oncl(this, this._content.find("#new2btn"), function(target){
			new AC.NewDirGrp(this.dir, 2);
		});
		AC.oncl(this, this._content.find("#imp2btn"), function(target){
			new AC.ImpGrp(this.dir, 2);
		});
		
		this._resMails = this._content.find("#resmails");
		this._inputFilter = this._content.find("#inputfilter");
		AC.oncl(this, this._content.find("#searchmails"), this.searchMails);		
		AC.oncl(this, this._content.find(".razbtn"), this.razbtn);
		AC.oncl(this, this._content.find(".removebtn"), this.removebtn);
		AC.oncl(this, this._content.find(".actbtn"), this.actbtn);
		AC.oncl(this, this._content.find(".mailbtn"), this.mailbtn);
		AC.oncl(this, this._content.find(".statsmailbtn"), this.statsMailbtn);
	},
	
	searchMails : function() {
		this._resMails.val("");
		var arg = {op:"86", _isRaw:true};
		arg.filter = this._inputFilter.val();
		arg.operation = "Recherche des contacts par e-mail";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			if (data) 
				this._resMails.val(data);
			else 
				this._resMails.val("aucun résultat pour cette recherche");
		}, "Recherche en échec : ");
	},
	
	displayRemovedGrps : function(sb, elts, type){
		for(var i = 0, x = null; x = elts[i]; i++){
			if (!x.removed)
				continue;
			sb.append("<div>" + x.initiales + " - " + x.label.escapeHTML() 
					+ " [" + x.code + "] : ");
			sb.append("n'est plus référencé depuis le " + AC.AMJ.dateCourte(x.removed) + "</div>");
		}
	},
	
	displayGrps : function(sb, elts, type){
		var n = 0;
		for(var i = 0, x = null; x = elts[i]; i++){
			if (x.removed) {
				n++;
				continue;
			}
			sb.append("<div class='acSpace1B color" + x.color + "'>");
			sb.append("<div class='bold large'>" + x.initiales + " - " + x.label.escapeHTML() 
					+ " [" + x.code + "]</div>");
			if (x.suppr)
				sb.append("<div class='bold red'>Supprimé le " + AC.AMJ.dateCourte(x.suppr) + "</div>");
			if (x.postit)
				sb.append("<div class='italic'>" + x.postit.escapeHTML() + "</div>");
			if (x.pwd2)
				sb.append("<div class='italic'>A un ou des mots de passe secondaires</div>");
			sb.append("<div>E-mails de synthèse hebdomadaire");
			var e1 = x.dirmail ? APP.Ctx.master.getElement(0, x.dirmail) : null;
			if (e1){
				sb.append(" : géré par " + e1.l);
				if (x.jourmail)
					sb.append(", planifié le <b>" + AC.AMJ.joursLongs2[x.jourmail - 1] + "</b>");
				if (x.mailer && x.mailer != "Z")
					sb.append(", par le mailer \"" + x.mailer + "\"");
				if (!x.jourmail || ! x.mailer || x.mailer == "Z")
					sb.append(" : NON envoyés");
			} else {
				sb.append(" : NON envoyés");
			}
			sb.append("</div>");
			if (x.dirs.length > 1){
				if (x.dirs.length > 2)
					sb.append("<div>Référencé aussi dans les annuaires suivants : <i>");
				else
					sb.append("<div>Référencé aussi dans l'annuaire <i>");
				var t = [];
				for(var j = 0, d = null; d = x.dirs[j]; j++)
					if (d != APP.Ctx.authDir)
						t.push(APP.Ctx.master.getElement(0, d).l);
				sb.append(t.join(", "));
				sb.append("</i></div>");
			}
			sb.append("<div class='btnBox' data-index='" + (type == 1 ? x.code : -x.code) + 
					"'><div class='action razbtn'>Remise à \"0000\" du mot de passe</div>");
			sb.append("<div class='action mailbtn'>Configuration du mailing ...</div>");
			sb.append("<div class='action statsmailbtn'>Détail du dernier mailing ...</div>");
			if (!x.suppr)
				sb.append("<div class='action removebtn'>Retirer de cet annuaire</div>");
			else
				sb.append("<div class='action actbtn'>Réactivation</div>");
			sb.append("</div>");
			sb.append("</div>");
		}
		return n;
	},
	
	statsMailbtn : function(target){
		var code = Util.dataIndex(target);
		var type = 1;
		if (code < 0) {
			var type = 2;
			code = -code;
		}
		new AC.ListMail().init(type, code);
	},
	
	razbtn : function(target){
		var arg = {op: "82"};
		var code = Util.dataIndex(target);
		if (code < 0) {
			arg.type = 2;
			arg.code = -code;
		} else {
			arg.type = 1;
			arg.code = code;			
		}
		arg.operation = "Remise à \"0000\" du mot de passe ";
		AC.Req.post(this, "alterconsos", arg, "Remise à \"0000\" du mot de passe faite",
			"Echec de la remise à \"0000\"");
	},
	
	removebtn : function(target){
		var arg = {op: "78"};
		var code = Util.dataIndex(target);
		if (code < 0) {
			arg.type = 2;
			arg.code = -code;
		} else {
			arg.type = 1;
			arg.code = code;			
		}
		arg.operation = "Retirer de l'annuaire ";
		AC.Req.post(this, "alterconsos", arg, "Retrait de l'annuaire fait",
			"Echec du retrait de l'annuaire");		
	},
	
	actbtn : function(target){
		var arg = {op: "79"};
		var code = Util.dataIndex(target);
		if (code < 0) {
			arg.type = 2;
			arg.code = -code;
		} else {
			arg.type = 1;
			arg.code = code;			
		}
		arg.operation = "Réactivation du " + ["", "groupe", "groupement"][arg.type];
		AC.Req.post(this, "alterconsos", arg, "Réactivation faite",
			"Echec de la réactivation");		
	},
	
	mailbtn : function(target){
		var code = Util.dataIndex(target);
		var type = 1;
		if (code < 0) {
			var type = 2;
			code = -code;
		}
		new AC.MailCfg(this.dir, type, code);
	}
	
}
AC.declare(AC.LocalDir, AC.Page);

/** ************************************************* */

AC.NewDirGrp = function(dir, type){
	this.className = "NewDirGrp";
	this.dir = dir;
	this.type = type;
	this.elt = {initiales:"", label:""};
	var t = new StringBuffer();
	t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
	t.append(AC.NewDirGrp.html);
	AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Créer", true, 
			["Nouvel Annuaire", "Nouveau Groupe d'alterconsos", "Nouveau Groupement de producteurs"][type]);
		
	this._nouveauContactInput = this._content.find("[data-ac-id='nouveauContactInput']");
	this._nouveauContactInput.val("");
	this._nouveauContactInput2 = this._content.find("[data-ac-id='nouveauContactInput2']");
	this._nouveauContactInput2.val("");
	this._nouveauDiag = this._content.find("[data-ac-id='diag']");
	this._nouveauDiag.html("");

	var mc = new AC.MC("AC.UpdateDir", this);
	mc.addVar("label", "elt", this.checkLabel);
	mc.addVar("initiales", "elt", this.checkInitiales);
	mc.addHtml("valider", this.enregistrer);
	mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
	mc.addExpr(0, {e : "edited", x : "error", v:"_valider"}, 
		"var b =e && !x; Util.btnEnable(v,b)");
	
	mc.addInput("label", "label");
	mc.addInput("initiales", "initiales");
	mc.checkAll(function(){
		var v = this.MC.val("label");
		if (!v)
			return "Un nom est requis";
		v = this.MC.val("initiales");
		if (!v)
			return "Des initiales sont requises";
		return null;
	});
	this.MC.begin().sync("elt", this.elt).commit();

	this.show();
}
AC.NewDirGrp._static = {
	html : "<div class='acLabel'>Nom</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='label' /></div>"
		+ "<div class='acLabel'>Initiales</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='initiales' /></div>"

}
AC.NewDirGrp._proto = {
	checkLabel : function(val, obj) {
		if (!val || val.length < 4)
			return "Le nom doit avoir plus de 3 caractères";
		var x = this.dir.getOfLabel(0, val);
		if (x && x.code != this.code)
			return "Le nom a déjà été attribué au code " + x.code;
		return null;
	},
	
	checkInitiales : function(val, obj) {
		var d = Util.checkInitiales(val);
		if (d) 
			return d;
		var x = this.dir.getOfInitiales(0, val);
		if (x && x.code != this.code)
			return "Les initiales ont déjà été attribué au code " + x.code;
		return null;
	},

	enregistrer : function() {
		var lb = ["à l'annuaire", "au groupe", "au groupement"][this.type];
		var lb2 = ["annuaire", "groupe", "groupement"][this.type];
		var arg = {op: this.type ? "77" : "70"};
		arg.label = this.MC.valEd("label");
		arg.initiales = this.MC.valEd("initiales").toUpperCase();
		arg.type = this.type;
		arg.operation = "Création d'un " + lb2;
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this._nouveauContactInput.val("");
			this.close();
			AC.Message.info("Création faite");
		}, "Echec de la création");
	}

}
AC.declare(AC.NewDirGrp, AC.SmallScreen);

/** ******************************************************** */
AC.UpdateDir = function(dir, code){
	this.className = "UpdateDir";
	this.dir = dir;
	this.code = code;
	this.elt = dir.getElement(0, code);
	var t = new StringBuffer();
	t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
	t.append(AC.UpdateDir.html);
	AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Valider", true, 
			"Mise à jour de la description de l'annuaire");
	
	new AC.Color(this, "colors");
	var mc = new AC.MC("AC.UpdateDir", this);
	mc.addVar("label", "elt", this.checkLabel);
	mc.addVar("initiales", "elt", this.checkInitiales);
	mc.addVar("postit", "elt").addVar("color", "elt");	
	mc.addHtml("valider", this.enregistrer);
	mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
	mc.addExpr(0, {e : "edited", x : "error", v:"_valider"}, 
		"var b =e && !x; Util.btnEnable(v,b)");
	
	mc.addInput("label", "label");
	mc.addInput("initiales", "initiales");
	mc.addInput("postit", "postit");
	mc.addRich("colors", "color");
	this.MC.begin().sync("elt", this.elt).commit();

	this.show();
}
AC.UpdateDir._static = {
//
	html : "<div class='acLabel'>Nom</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='label' /></div>"
		+ "<div class='acLabel'>Initiales</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='initiales' /></div>"
		+ "<div class='acLabel'>Couleur préférée</div>"
		+ "<div class='acEntry' data-ac-id='colors'></div>"
		+ "<div class='acLabel'>Postit</div><div class='acEntry'>"
		+ "<textarea data-ac-id='postit'></textarea></div>"
//
}
AC.UpdateDir._proto = {
	checkLabel : function(val, obj) {
		if (!val || val.length < 4)
			return "Le nom doit avoir plus de 3 caractères";
		var x = this.dir.getOfLabel(0, val);
		if (x && x.code != this.code)
			return "Le nom a déjà été attribué au code " + x.code;
		return null;
	},
	
	checkInitiales : function(val, obj) {
		var d = Util.checkInitiales(val);
		if (d) 
			return d;
		var x = this.dir.getOfInitiales(0, val);
		if (x && x.code != this.code)
			return "Les initiales ont déjà été attribué au code " + x.code;
		return null;
	},

	enregistrer : function() {
		var arg = {op: "76"};
		var x = this.MC.valEd("label");
		if (x != null)
			arg.label = x;
		var x = this.MC.valEd("color");
		if (x != null)
			arg.couleur = x;
		x = this.MC.valEd("initiales");
		if (x != null)
			arg.initiales = x.toUpperCase();
		x = this.MC.valEd("postit");
		if (x != null)
			arg.postit = x;
		arg.code = this.code;
		arg.type = 0;
		arg.operation = "Mise à jour de la description de l'annuaire";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this.close();
			AC.Message.info("Mise à jour faite");
		}, "Echec de la mise à jour");
	}

}
AC.declare(AC.UpdateDir, AC.SmallScreen);

/** ******************************************************** */
AC.ImpGrp = function(dir, type){
	this.className = "ImpGrp";
	this.dir = dir;
	this.type = type;

	var t = new StringBuffer();
	t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
	t.append(AC.ImpGrp.html);
	AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Importer", true, 
			"Importation d'un " + ["", "groupe", "groupement"][this.type] + " d'un autre annuaire");
	
	var self = this;
	this.masterDecor = APP.Ctx.master.decor(0, null, function(elt) {
		return !elt.suppr && elt.code != self.dir.code && elt.code;
	}, true);
	new AC.RadioButton(this, "impDir", this.masterDecor);

	var mc = new AC.MC("AC.ImpGrp", this);
	mc.addVar("code", "elt", function(v){
		if (typeof v != "number" || v < 1)
			return "Le code doit être supérieur à 0";
		return null;
	});
	mc.addVar("pwd", "elt").addVar("impDir", "elt");	
	mc.addHtml("valider", this.enregistrer);
	mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
	mc.addExpr(0, {e : "edited", x : "error", v:"_valider"}, 
		"var b =e && !x; Util.btnEnable(v,b)");
	
	mc.addInput("pwd", "pwd");
	mc.addInput("code", "code", null, INT.editD0, INT.Str2N0);
	mc.addRich("impDir", "impDir");
	mc.checkAll(function(){
		var v = this.MC.val("pwd");
		if (!v)
			return "Un mot de passe est requis";
		v = this.MC.val("impDir");
		if (!v)
			return "L'annuaire source est requis";
		v = this.MC.val("code");
		if (!v)
			return "Le code du groupe / groupement à importer est requis";
		return null;
	});
	this.MC.begin().sync("elt", {pwd:"", code:0, impDir:0}).commit();

	this.show();
}
AC.ImpGrp._static = {
//
	html : "<div class='acdd-label italic'>Autre annuaire : </div>"
		+ "<div class='aclogbox' data-ac-id='impDir'></div>"
		+ "<div class='acLabel'>Code du groupe / groupement à importer :</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='code' /></div>"
		+ "<div class='acLabel'>Mot de passe :</div><div class='acEntry'>"
		+ "<input type='password' data-ac-id='pwd' /></div>"
//
}
AC.ImpGrp._proto = {

	enregistrer : function() {
		var arg = {op: "80"};
		arg.code = this.MC.valEd("code");
		arg.impDir = this.MC.valEd("impDir");
		var x = this.MC.valEd("pwd");
		arg.pwd = APP.Ctx.getPwd(x, this.type, arg.code);
		arg.type = this.type;
		arg.operation = "Mise à jour de la description de l'annuaire";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this.close();
			AC.Message.info("Mise à jour faite");
		}, "Echec de la mise à jour");
	}

}
AC.declare(AC.ImpGrp, AC.SmallScreen);

/** ******************************************************** */
AC.PwdDir = function(dir, code){
	this.className = "PwdDir";
	this.dir = dir;
	this.code = code;
	this.elt = dir.getElement(0, code);
	var t = new StringBuffer();
	t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
	t.append(AC.PwdDir.html);
	AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Valider", true, 
			"Changement du mot de passe de l'annuaire " + this.elt.label);
	
	var mc = new AC.MC("AC.PwdDir", this);
	mc.addVar("pwd", "elt");
	mc.addHtml("valider", this.enregistrer);
	mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
	mc.addExpr(0, {e : "edited", x : "error", v:"_valider"}, 
		"var b =e && !x; Util.btnEnable(v,b)");
	mc.checkAll(function(){
		var v = this.MC.val("pwd");
		if (!v || v.length < 4)
			return "Un mot de passe d'au moins 4c est requis";
		return null;
	});
	mc.addInput("pwd", "pwd");
	this.MC.begin().sync("elt", {pwd:""}).commit();

	this.show();
}
AC.PwdDir._static = {
//
	html : "<div class='acLabel'>Mot de passe</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='pwd' /></div>"
//
}
AC.PwdDir._proto = {
	enregistrer : function() {
		var arg = {op: "75"};
		var x = this.MC.valEd("pwd");
		arg.pwd = APP.Ctx.getPwd(x, 0, this.code);
		arg.code = this.code;
		arg.type = 0;
		arg.operation = "Mise à jour du mot de passe de l'annuaire";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this.close();
			AC.Message.info("Mise à jour faite");
		}, "Echec de la mise à jour");
	}

}
AC.declare(AC.PwdDir, AC.SmallScreen);

/** ******************************************************** */
AC.MailCfg = function(dir, type, code){
	this.className = "PwdDir";
	this.dir = dir;
	this.type = type;
	this.code = code;
	this.elt = dir.getElement(type, code);
	var t = new StringBuffer();
	t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
	t.append(AC.MailCfg.html);
	AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Valider", true, 
			"Configuration du mailing hebdomadaire " + this.elt.label);
	
	var decor = [{code:0, label:'(aucun)'}, {code:1, label:"Lundi"}, {code:2, label:"Mardi"},
	             {code:3, label:"Mercredi"}, {code:4, label:"Jeudi"},
	             {code:5, label:"Vendredi"}, {code:6, label:"Samedi"}, {code:7, label:"Dimanche"}];
	new AC.RadioButton(this, "jourmail", decor, "(aucun)");

	var mc = new AC.MC("AC.PwdDir", this);
	mc.addVar("jourmail", "elt");
	mc.addVar("mailer", "elt", function(val){
		if (val && !(val >= "A" && val <= "Z"))
			return "Le code du mailer est une lettre de A à Z";
		return null;
	});
	mc.addHtml("valider", this.enregistrer);
	mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
	mc.addExpr(0, {x : "error", v:"_valider"}, "Util.btnEnable(v,!x)");
	mc.addInput("mailer", "mailer");
	mc.addRich("jourmail", "jourmail");
	this.MC.begin().sync("elt", this.elt).commit();

	this.show();
}
AC.MailCfg._static = {
//
	html : "<div class='acdd-label  italic'>Jour de mailing : </div>"
		+ "<div class='aclogbox' data-ac-id='jourmail'></div>"
		+ "<div class='acLabel'>Code du mailer (une lettre de A à Z)</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='mailer' /></div>"
//
}
AC.MailCfg._proto = {
	enregistrer : function() {
		var arg = {op: "81"};
		var x = this.MC.valEd("jourmail");
		if (x != null)
			arg.jourmail = x
		x = this.MC.valEd("mailer");
		if (x != null)
			arg.mailer = x;
		arg.code = this.code;
		arg.type = this.type;
		arg.operation = "Mise à jour de la configuration du mailing";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this.close();
			AC.Message.info("Mise à jour faite");
		}, "Echec de la mise à jour");
	}

}
AC.declare(AC.MailCfg, AC.SmallScreen);

/** ******************************************************** */
AC.ListMail = function(){}
AC.ListMail._static = {
	html : "<div class='acDivScroll'>"
		+ "<div data-ac-id='traceMail'></div>"
		+ "</div>"
}
AC.ListMail._proto = {

	init : function(type, grp) {
		this.name = "ListMail";
		this.usr = 0;
		this.traceMail = AC.TraceMail.getN(type, grp);
		this.traceMail.attach(this);
		AC.Req.sync();
		
		AC.SmallScreen.prototype.init.call(this, -900, AC.ListMail.html, null, true, 
				"Trace détaillée des derniers messages envoyés");
		
		this._traceMail = APP.id(this, "traceMail");
		this.displayTM();
		
		this.show();
	},
	
	enEdition : function() {
		return false;
	},
	
	enErreur : function() {
		return false;
	},
	
	close : function(){
		if (this.traceMail)
			this.traceMail.detach(this);
		AC.SmallScreen.prototype.close.call(this);
	},
	
	onCellsChange : function(cells){
		for(var i = 0, c = null; c= cells[i]; i++){
			if (c == this.traceMail) {
				this.displayTM();
			}
		}
	},
	
	displayTM : function(){
		this._traceMail.html(this.traceMail.edit());
	},
	
	enregistrer : function() {
	}
}
AC.declare(AC.ListMail, AC.SmallScreen);

/** ************************************************** */
