/** ******************************************************** */
AC.FormPrixS2B = function(origin, codeLivr){
	this.init(origin, codeLivr);
}
AC.FormPrixS2B._static = {
	htmlPR : "<div class='large'><b>Passer en revue les 3 étapes,</b> chacune étant facultative</div>"
		+ "<div class='acPrixStep'>"
		+ "Etape #1 : mise à jour (éventuelle) de la description applicable à toutes les livraisons passées, présentes et futures</div>"

		+ "<div class='acLabel'>Nom du produit, unique pour le producteur</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='nom' /></div>"
		
		+ "<div class='acSpace0505 large bold italic' data-ac-id='parDemi'>&nbsp;</div>"
		
		+ "<div class='acLabel'>Description détaillée</div><div class='acEntry'>"
		+ "<textarea data-ac-id='postit'></textarea></div>"
		
		+ "<div class='acLabel'>&nbsp;</div><div class='acEntry'>"
		+ "<div data-ac-id='froid'></div></div>"
		
//		+ "<div class='acLabel '><div>Pourcentage du poids du produit à ajouter "
//		+ "pour avoir le poids brut au transport (cartons, palettes ... par exemple 5%)</div></div><div class='acEntry'>"
//		+ "<input data-ac-id='poidsemb' type='text'></input></div>"

		+ "<div class='acLabel'>Conditonnement</div><div class='acEntry'>"
		+ "<div><div class='acdd-box italic' data-ac-id='selectCond'>... les plus courants :</div></div>"
		+ "<input data-ac-id='cond' type='text'></input></div>"

		+ "<div class='acLabel'>Label Bio</div><div class='acEntry'>"
		+ "<div><div class='acdd-box  italic' data-ac-id='selectBio'>... les plus courants :</div></div>"
		+ "<input data-ac-id='bio' type='text'></input></div>"
		+ "<div class='acPrixStep'>"
		+ "Etape #2 : mise à jour (éventuelle) des conditions de vente ",
		
	html1 :  "<br></div><div class='acLabel'>Disponibilité du produit</div><div class='acEntry'>"
		+ "<div class='acdd-label'></div>"
		+ "<div data-ac-id='selectDispo'></div></div>"
		
		+ "<div class='acLabel'><div>",
		
	html2 : " <b>(en €)</b></div><div data-ac-id='pued'></div></div><div class='acEntry'>"
		+ "<input data-ac-id='pu' type='text'></input></div>"
		
		+ "<div class='acLabel'>&nbsp;</div><div class='acEntry'>"
		+ "<div data-ac-id='parite'></div></div>"
		
		+ "<div class='acLabel'><div>Alerte en cas de commande "
		+ "d'une quantité supérieure à ce seuil</div><div data-ac-id='qmaxed'></div></div><div class='acEntry'>"
		+ "<input data-ac-id='qmax' type='text'></input></div>"
		+ "<div class='acLabel'><div>",

	html3 : "</div><div data-ac-id='poidsed'></div></div><div class='acEntry'>"
		+ "<input data-ac-id='poids' type='text'></input></div>"
		+ "<div class='acLabel'>Ce produit N'EST PAS proposé </div><div class='acEntry'>"
		+ "<div class='acdd-box italic' data-ac-id='gacExcl'>... aux groupes ci-dessous :</div>"
		+ "<div data-ac-id='gacExcllist'></div></div>"
		+ "<div data-ac-id='etape3'><div class='acPrixStep'>Etape #3 : recopie (éventuelle) de ces conditions sur d'autres dates de livraisons</div>"
		+ "<div>Cliquer sur les dates pour les sélectionner / déselectionner</div>"
		+ "<div data-ac-id='lstLivr'></div></div>"
		
}
AC.FormPrixS2B._proto = {
	init : function(origin, codeLivr) {
		this.className = "FormPrixS";
		this.origin = origin;
		this.produit = this.origin.produit;
		this.listCVS2 = this.origin.listCVS2;
		this.cvs = this.listCVS2.cvs;
		this.lvs = this.listCVS2.lvs;
		this.w = true;
		this.changePrix = false;
		this.codeLivr = codeLivr;
		this.cellCtlg = this.origin.cellCtlg;
		
		for(var i = 0, lv = null; lv = this.lvs[i]; i++){
			if (lv.codeLivr == codeLivr){
				this.lv = lv;
				this.cv = this.cvs[this.lv.icv];
				break;
			}
		}
		
		this.clLabel = codeLivr ? ("de la livraison du <span style='color:black'>" + 
				AC.AMJ.dateMCourte(this.lv.expedition) + " [" + codeLivr + "]</span>")
				: "de <span style='color:black'>Référence</span>";

		this.prix = {dispo:this.cv.dispo, pu:this.cv.pu, poids:this.cv.poids, qmax:this.cv.qmax,
				parite:this.cv.parite ? true : false, gacExcl:this.cv.gacExcl };
		
		this.parDemi = this.produit.parDemi;
		
		this.curPrix = {};
		this.selected = [];
		this.cvHasChanged = false;
		this.changedPrix = {}
		
		var t = new StringBuffer();
		t.append("<div class='acDivScroll' id='topDiv'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
		t.append(AC.FormPrixS2B.htmlPR);
		t.append(this.clLabel);
		t.append(AC.FormPrixS2B.html1);
		t.append(["", "Prix unitaire", "Prix au Kg", "Prix au Kg"][this.produit.type]);
		t.append(AC.FormPrixS2B.html2);
		t.append(["", "Poids brut", "Poids moyen", "Poids moyen"][this.produit.type]);
		t.append(AC.FormPrixS2B.html3);
		
		AC.SmallScreen.prototype.init.call(this, 800, t.append("</div>").toString(), "Valider", true, 
			this.produit.nom.escapeHTML() + "<br>Description et conditions de vente du produit");

		this._etape3 =  APP.id(this, 'etape3');
		this._lstLivr = APP.id(this, 'lstLivr');

		this.decor3 = [];
		var dispos = ["NON disponible", "Production basse", "Production normale", "Production forte", "Supplément"];
		for ( var i = 0, x = null; x = dispos[i]; i++)
			this.decor3.push({code : i, label : x});
		new AC.RadioButton(this, "selectDispo", this.decor3, true);
		
		var ag = "<span class='italic'>(Aucun groupe non livré)</span>";
		var decor4 = APP.Ctx.dir.decor(1, null, function(elt){
			return !elt.removed;
		}, true);
		new AC.MultiSelector3(this, "gacExcl", decor4, ag);

		new AC.CheckBox2(this, "parite", "Commande par un groupe en quantité paire", false);

		this._parDemi = APP.id(this, "parDemi");
		
		this.decor1P = this.cellCtlg.decorCond;
		new AC.Selector3(this, "selectCond", this.decor1P, false);
		
		this.decor2P = this.cellCtlg.decorBio;
		new AC.Selector3(this, "selectBio", this.decor2P, false);

		new AC.CheckBox2(this, "froid", "Transport froid requis", false);

		var mc = new AC.MC("AC.FormProduitS", this);
		mc.addVar("nom", "pr", function(val, obj){
			var p = this.cellCtlg.hasNom(this.origin.ap, this.origin.pr, val);
			if (p)
				return "Le nom a déjà été utilisé pour le produit " + p;
			return null;
		});
		mc.addVar("postit", "pr").addVar("parDemi", "pr").addVar("cond", "pr")
		.addVar("bio", "pr").addVar("froid", "pr", null, Util.BoolEqual);
		mc.addVar("scond", "pr", function(val, obj){
			for ( var i = 0, x = null; x = this.decor1P[i]; i++) {
				if (x.code == val) {
					this.MC.set("cond", x.label);
					break;
				}
			}
		}, null, true);
		mc.addVar("sbio", "pr", function(val, obj){
			for ( var i = 0, x = null; x = this.decor2P[i]; i++) {
				if (x.code == val) {
					this.MC.set("bio", x.label);
					break;
				}
			}
		}, null, true);		
//		mc.addVar("poidsemb", "pr", function(val, obj){
//			var v = INT.Str2N0("" + val);
//			if (v < 0 || v > 50)
//				return "La valeur doit être numérique et comprise entre 0 et 50";
//			return null;
//		});		
		mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
		mc.addExpr(0, {d : "parDemi"}, "this._parDemi.html(d ? 'Peut être commandé par DEMI part' : '&nbsp;')");
		mc.addHtml("valider", this.enregistrer);
		mc.addExpr(0, {e : "edited", x : "error", v:"_valider"}, "Util.btnEnable(v,e && !x)");
		mc.addRich("selectBio", "sbio");
		mc.addRich("selectCond", "scond");
		mc.addRich("froid", "froid");
		mc.addInput("bio", "bio");
		mc.addInput("cond", "cond");
		mc.addInput("nom", "nom");
		mc.addInput("postit", "postit");
//		mc.addInput("poidsemb", "poidsemb");
		mc.addVar("pu", "prix");
		mc.addVar("poids", "prix");
		mc.addVar("parite", "prix", null, Util.BoolEqual);
		mc.addVar("dispo", "prix");
		mc.addVar("qmax", "prix", function(v){
			if (typeof v != "number" || v < 0)
				return "Quantité maximale : nombre mal formé";
			return null;
		});
		mc.addVar("gacExcl", "prix", null, Util.ArraySameContent);

		mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
		mc.addRich("gacExcl", "gacExcl");
		mc.addRich("selectDispo", "dispo");
		mc.addRich("parite", "parite");
		
		mc.addExpr(0, {n:"pu", v:"_pued"}, "Util.html(v, INT.editE(n))");
		mc.addExpr(0, {n:"poids", v:"_poidsed"}, "Util.html(v, INT.editKg(n))");
		mc.addExpr(0, {n:"qmax", v:"_qmaxed"}, "Util.html(v, INT.editX2(n))");

		mc.addInput("pu", "pu", null, INT.editD2, INT.Str2N2);
		mc.addInput("poids", "poids", null, INT.editD3, INT.Str2N3);
		mc.addInput("qmax", "qmax", null, INT.editD0, INT.Str2N0);
		mc.checkAll(function(){
			this.changePrix = this.MC.valEd("pu") || this.MC.valEd("poids") || this.MC.valEd("parite")
			|| this.MC.valEd("dispo") || this.MC.valEd("qmax") || this.MC.valEd("gacExcl");
			var v = this.MC.val("pu");
			if (typeof v != "number" || v < 0)
				return "Prix unitaire : nombre mal formé";
			if (v == 0)
				return "Un prix à 0 n'est pas accepté";
			v = this.MC.val("poids");
			if (typeof v != "number" || v < 0)
				return "Poids : nombre mal formé";
			if (v == 0)
				return "Un poids à 0 n'est pas accepté";
			return null;
		});
		mc.afterCommit(this.atChange);
		mc.begin().sync("prix", this.prix).sync("pr", this.produit).commit();
		
		this.show();
		this.setArgs();
		this.dispLivrs();
	},
	
	dispLivrs : function() {
		this._lstLivr.html(this.origin.listCVEditS2(this.codeLivr, this.selected, this.curPrix));
		this._codesLivr = this._lstLivr.find(".codeLivr");
		AC.oncl(this, this._codesLivr, function(target) {
			var lv = this.lvs[Util.dataIndex(target, "ilv")];
			var is = this.selected.indexOf(lv.codeLivr);
			if (is == -1)
				this.selected.push(lv.codeLivr);
			else
				this.selected.splice(is, 1);
			this.dispLivrs();
		});
		var self = this;
		this._codesLivr.each(function(){
			var btn = $(this);
			var lv = self.lvs[Util.dataIndex(btn, "ilv")];
			var is = self.selected.indexOf(lv.codeLivr);
			if (self.idx != -1 && (lv.icv == self.idx || self.cvEqual(self.cvs[lv.icv], self.cvs[self.idx]))) {
				btn.removeClass("codeLivrBtn");
				if (is != -1) {
					btn.removeClass("codeLivrSel");
					self.selected.splice(is, 1);
				}
			} else {
				btn.addClass("codeLivrBtn");				
				if (is != -1)
					btn.addClass("codeLivrSel");
				else
					btn.removeClass("codeLivrSel");
			}
		});
		this.enable();
	},
	
	atChange : function(){
		// c'était pas une bonne idée : bloque les recopies
		// this._etape3.css("display", this.changePrix ? "block" : "none");
		this.setArgs();
		this.dispLivrs();
	},
	
	setArgs : function(){
		var arg2 = this.curPrix;
		var arg = {};
		arg2.gacExcl = this.MC.val("gacExcl");
		// delete arg2.gacExclS; // inutile c'est écrasé juste en dessous
		this.cellCtlg.setGacExclS(arg2);
		var x = this.MC.valEd("gacExcl");
		if (x != null) {
			arg.gacExcl = x;
			arg.gacExcl.sort(AC.Sort.num);
			this.cellCtlg.setGacExclS(arg);
		}
		
		arg2.qmax = this.MC.val("qmax");
		x = this.MC.valEd("qmax");
		if (x != null)
			arg.qmax = !this.parDemi ? x : Math.floor(x * 2);
		
		arg2.poids = this.MC.val("poids");
		x = this.MC.valEd("poids");
		if (x != null)
			arg.poids = this.parDemi && this.produit.type != 2 ? Math.floor(x / 2) : x;
			
		arg2.pu = this.MC.val("pu");
		x = this.MC.valEd("pu");
		if (x != null)
			arg.pu = this.parDemi && this.produit.type == 1 ? Math.floor(x / 2) : x;

		arg2.dispo = this.MC.val("dispo");
		x = this.MC.valEd("dispo");
		if (x != null)
			arg.dispo = x;
		
		arg2.parite = this.MC.val("parite") ? 1 : 0;
		x = this.MC.valEd("parite");
		if (x != null)
			arg.parite = x ? 1 : 0;
				
		this.idx = -1;
		for(var i = 0, cv = null; cv = this.cvs[i]; i++){
			if (this.cvEqual(cv, arg2)) {
				this.idx = i;
				break;
			}
		}
		this.cvHasChanged = arg.gacExcl != undefined || arg.pu != undefined || arg.poids != undefined 
		|| arg.qmax != undefined || arg.dispo != undefined || arg.parite != undefined;
		this.changedPrix = arg;
	},
	
	cvEqual : function(a, b){
		return a.dispo == b.dispo && a.pu == b.pu && a.poids == b.poids && a.qmax == b.qmax
				&& a.parite == b.parite && a.gacExclS == b.gacExclS;
	},
			
	enEdition : function() {
		return this.MC.val("edited") || this.selected.length;
	},

	enErreur : function() {
		return this.MC.val("error");
	},
			
	enregistrer : function() {		
		var arg = this.cvHasChanged ? this.changedPrix : {};
		arg.op = "11";
		arg.gap = this.origin.grp;
		arg.apr = this.origin.ap;
		arg.pr = this.origin.pr;
		var x = this.MC.valEd("nom");
		if (x != null)
			arg.nom = x;
		x = this.MC.valEd("postit");
		if (x != null)
			arg.postit = x;
		x = this.MC.valEd("cond");
		if (x != null)
			arg.cond = x;
		x = this.MC.valEd("bio");
		if (x != null)
			arg.bio = x;
//		x = this.MC.valEd("poidsemb");
//		if (x != null)
//			arg.poidsemb = parseInt(x, 10);
		x = this.MC.valEd("froid");
		if (x != null)
			arg.froid = x ? 1 : 0;

		if (this.cvHasChanged || this.selected.length)
			arg.codeLivr = this.codeLivr;

		if (this.selected && this.selected.length)
			arg.autres = this.selected;
		
		arg.operation = "Mise à jour du produit";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this.close();
			AC.Message.info(arg.operation + " : faite");
			setTimeout(function() {
				AC.Req.sync(); // Dans function, sinon this est Window
			} , 5000); // MAJ prix asynchrone sur le serveur !!!
		}, "Echec de la mise à jour : ");
	}

}
AC.declare(AC.FormPrixS2B, AC.SmallScreen);

/** ******************************************************** */
AC.FormContactS = function(cell, elt, w){
	this.init(cell, elt, w);
};
AC.FormContactS._static = {
	//
	html1 : "<div class='acLabel'>Nom</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='nom' /></div>"
		+ "<div class='acLabel'>Initiales</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='initiales' /></div>"
		+ "<div class='acLabel'>Couleur préférée</div>"
		+ "<div class='acEntry' data-ac-id='colors'></div>"
		+ "<div class='acLabel'>Adresse de localisation (lieu habituel de livraison, adresse d'exploitation) :"
		 + "<br><span class='small'>Par exemple: 55 rue du faubourg Saint-Honoré, 75008 Paris</div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='localisation' />"
		+ "<div id='admaps'>Tester si cette adresse est localisable par Google Maps"
		+ "<a class='acMapsBtn2' id='adhab' target='_blank'></a></div></div>",

	html1b : "<div class='acLabel'>Chèques à établir à l'ordre de : </div><div class='acEntry'>"
		+ "<input type='text' data-ac-id='ordreCheque' /></div>",

	html2 : "<div class='acLabel'>Confidentialité des données ci-après</div>"
		+ "<div class='acEntry' data-ac-id='confid'>"
		+ "<div class='acdd-label italic'></div>"
		+ "<div data-ac-id='confidentialite'></div></div>"

		+ "<div class='acLabel'>Postit</div><div class='acEntry'>"
		+ "<textarea id='ContactPostit' data-ac-id='postit'></textarea></div>"

		+ "<div class='acLabel'>Une ou plusieurs adresses e-mail sur "
		+ "des lignes différentes (séparées par 'Entrée')</div><div class='acEntry'>"
		+ "<textarea id='ContactEmail1' data-ac-id='email1'></textarea></div>"
				
		+ "<div class='acSpace0505' data-ac-id='nomail'></div>"

		+ "<div class='acSpace0505' data-ac-id='unclic'></div>"

		+ "<div class='acLabel'>Numéros de téléphone (texte libre)</div><div class='acEntry'>"
		+ "<input type='tel' id='ContactTelephones' data-ac-id='telephones' /></div>",
				
	html3 : "<div class='acSpace0505' data-ac-id='aContacter'></div><div class='acLabel'>"

		+ "Code adhérent à l'association (facultatif)</div><div class='acEntry'>"
		+ "<input type='text' id='ContactAdherent' data-ac-id='adherent' /></div>",
		
	html3a :  "<div class='acLabel'>Dernière cotisation payée</div><div class='acEntry'>"
		+ "<input type='text' id='ContactDerniereCotis' data-ac-id='derniereCotis' /></div>",

	html3b :  "<div class='acCadre'>"
		+ "<div class='ac-space1rem bold'>Contribution aux frais du groupement</div>"
		+ "<div class='acLabel'>Pourcentage de prélèvement (0 -99) :</div><div class='acEntryShort'>"
		+ "<input type='text' id='tauxPrelev' data-ac-id='tauxPrelev' /></div>"
		+ "<div><div class='acLabel'>Date d'application (AAMMJJ) :</div><div class='acEntryShort'>"
		+ "<input type='text' id='datePrelev' data-ac-id='datePrelev' /></div>"
		+ "<div class='action5' data-ac-id='addTaux'>Ajouter</div></div>"
		+ "<div class='acSpace0505 red' id='diagPrelev'></div>"
		+ "<div class='acSpace0505 italic' id='lstPrelev'>Taux applicables</div>"
		+ "</div>",

	html4 : "<div class='ac-space1rem'>"
		+ "<div class='acdd-box italic' data-ac-id='gaps'>Correspondant des groupements :</div>"
		+ "<div data-ac-id='gapslist'></div></div>"
		
		+ "<div class='ac-space1rem'>" 
		+ "<div class='acdd-box italic' data-ac-id='gapsExcl'>Groupements NON proposés à la commande :</div>"
		+ "<div data-ac-id='gapsExcllist'></div></div>",

	html5 : "<div class='ac-space1rem' data-ac-id='novol'></div>",

	code : 0, 
	confs : [{label : "restreinte", code : 2},
	         {label : "normale", code : 0},
	         {label : "publique", code : 1}]

}
AC.FormContactS._proto = {	
	init : function(cell, elt, w) {
		this.name = "FormContactS";
		this.cell = cell;
		this.elt = elt;
		this.elt.confidentialite = this.elt.confidentialite ? this.elt.confidentialite : 0;
		this.codeContact = this.elt.code;
		this.w = w;
		
		var t = new StringBuffer();
		t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
		
		t.append(AC.FormContactS.html1);
		if (this.w > 2) {
			t.append(AC.FormContactS.html3);
			t.append(this.cell.isGAC ? AC.FormContactS.html3a : AC.FormContactS.html3b);
		}
		if (this.w > 1){
			if (!this.cell.isGAC)
				t.append(AC.FormContactS.html1b);
			t.append(AC.FormContactS.html2);
			if (this.w > 2 && this.cell.isGAC)
				t.append(AC.FormContactS.html4);
		}
		if (this.codeContact == 1)
			t.append(AC.FormContactS.html5);
		
		AC.SmallScreen.prototype.init.call(this, -800, t.append("</div>").toString(), "Valider", true, 
				this.elt.nom.escapeHTML() + "<br>Données personnelles");

		if (this.cell.isGAC){
			var decor = APP.Ctx.dir.decor(2, null, function(elt){
				return !elt.removed;
			}, true);
			var ag = "<span class='italic'>(Aucun groupement)</span>";
			new AC.MultiSelector3(this, "gaps", decor, ag);
			new AC.MultiSelector3(this, "gapsExcl", decor, ag);
		}
		
		if (this.w > 1)
			new AC.RadioButton(this, "confidentialite", this.constructor.confs, true);

		new AC.CheckBox2(this, "nomail", "NE PAS recevoir la synthèse périodique par e-mail");

		new AC.CheckBox2(this, "unclic", "Activer les accès en 1 clic sur les e-mail de synthèse périodique (moindre sécurité)");

		new AC.CheckBox2(this, "aContacter", "Animateur pouvant être contacté par les membres du groupe / groupement");

		if (this.codeContact == 1)
			new AC.CheckBox2(this, "novol", "NE PAS afficher la gestion des volontaires");
			
		new AC.Color(this, "colors");
		
		this._admaps = this._content.find("#admaps");
		this._adhab = this._content.find("#adhab");
		
		var mc = new AC.MC("AC.FormContact", this);
		mc.addVar("nom", "elt", this.checkNom).addVar("initiales", "elt", this.checkInitiales);
		mc.addVar("postitContact", "elt");
		mc.addVar("localisation", "elt", this.checkLoc).addVar("email1", "elt").addVar("email2", "elt");
		mc.addVar("telephones", "elt").addVar("ordreCheque", "elt").addVar("color", "elt");
		mc.addVar("confidentialite", "elt").addVar("adherent", "elt");
		mc.addVar("groupements", "elt", null, Util.SortedArrayEqual);
		mc.addVar("grExcl", "elt", null, Util.SortedArrayEqual);
		mc.addVar("nomail", "elt", null, Util.BoolEqual).addVar("novol", "elt", null, Util.BoolEqual);
		mc.addVar("unclic", "elt", null, Util.BoolEqual).addVar("aContacter", "elt", null, Util.BoolEqual);
		
		mc.addVar("derniereCotis", "elt").addVar("tauxPrelev", "tpr").addVar("datePrelev", "tpr");
				
		mc.addHtml("valider", this.enregistrer);
		mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
		mc.addExpr(0, {e : "edited", x : "error", v:"_valider"}, 
			"var b =e && !x; Util.btnEnable(v,b)");
		mc.addExpr(0, {l : "localisation", m:"_admaps"}, "Util.btnEnable(m,l)");
		
		mc.addInput("nom", "nom");
		mc.addInput("initiales", "initiales");
		mc.addRich("colors", "color");

		if (this.codeContact == 1)
			mc.addRich("novol", "novol");
		
		if (this.w > 1){
			mc.addRich("confidentialite", "confidentialite");
			mc.addRich("nomail", "nomail");
			mc.addRich("unclic", "unclic");
			mc.addInput("localisation", "localisation");
			mc.addInput("postit", "postitContact");
			mc.addInput("email1", "email1");
			mc.addInput("telephones", "telephones");
			if (!this.cell.isGAC)
				mc.addInput("ordreCheque", "ordreCheque");
			if (this.w > 2) {
				mc.addRich("aContacter", "aContacter");
				if (this.cell.isGAC)
					mc.addInput("derniereCotis", "derniereCotis");
				else {
					mc.addInput("tauxPrelev", "tauxPrelev");
					mc.addInput("datePrelev", "datePrelev");
					mc.addHtml("addTaux", this.addTaux);
				}
				mc.addInput("adherent", "adherent");
				if (this.cell.isGAC){
					mc.addRich("gaps", "groupements");
					mc.addRich("gapsExcl", "grExcl");
				}
			}
		}
		this.tpr = {tauxPrelev:"", datePrelev:""};
		this.MC.begin().sync("elt", this.elt).sync("tpr", this.tpr).commit();
		this.taux = [];
		this._lstPrelev = this._content.find("#lstPrelev");
		this._diagPrelev = this._content.find("#diagPrelev");
		this.show();
		this.editTaux();
	},
	
	getTaux : function() {
		var x = this.MC.val("derniereCotis");
		try {
			return x ? JSON.parse(x) : [];
		} catch (e) { return [];}
	},
	
	editTaux : function() {
		this._lstPrelev.html(Util.editTaux(this.MC.val("derniereCotis")));
	},
	
	addTaux : function() {
		var t = this.MC.valEd("tauxPrelev");
		var d = this.MC.valEd("datePrelev");
		if (t)
			t = t.replace(/\./g, '').replace(',', '.');
		if (!t  || isNaN(t)){
			this._diagPrelev.html("Le taux doit être un nombre compris entre 0 et 99")
			return;
		}
		var it = parseFloat(t);
		if (it < 0 || it > 99){
			this._diagPrelev.html("Le taux doit être un nombre compris entre 0 et 99 le cas échéant avec une virgule (4,5 par exemple)")
			return;
		}
		if (!d || isNaN(d)) {
			this._diagPrelev.html("La date est attendue sous la forme AAMMJJ (par exemple 151225)")
			return;		
		}
		var id = parseInt(d, 10); 
		var diag = AC.AMJ.diag(id)
		if (diag) {
			this._diagPrelev.html(diag)
			return;		
		}
		this._diagPrelev.html("");
		var x = this.MC.val("derniereCotis");
		try {
			var y = x ? JSON.parse(x) : [];
		} catch (e) { var y = [];}

		var y2 = [];
		var b = false;
		for (var i = 0, x = null; x = y[i]; i++) {
			if (x.date < id) {
				y2.push(x);
			} else {
				if (x.date == id) {
					b = true;
					y2.push({date:id, taux:it});
				} else {
					if (!b) {
						y2.push({date:id, taux:it});
						b = true;
					}
					y2.push(x);
				}
			}
		}
		if (!b)
			y2.push({date:id, taux:it});
		var y3 = [];
		for (var i = 0, x = null; x = y2[i]; i++) {
			if (i == 0) { 
				if (x.taux != 0)
					y3.push(x);
			} else {
				var x2 = y2[i-1];
				if (x.date > x2.date && x.taux != x2.taux)
					y3.push(x);
			}
		}
		var x = y3.length != 0 ? JSON.stringify(y3) : "";
		this.MC.begin().set("derniereCotis", x).set("tauxPrelev", null)
			.set("datePrelev", null).commit();
		this.editTaux();
	},

	enEdition : function() {
		return this.MC.val("edited");
	},

	enErreur : function() {
		return this.MC.val("error");
	},

	checkLoc : function(val, obj){
		if (val)
			this._adhab.attr("href", "http://maps.google.com/maps?q=" + encodeURIComponent(val));
		return null;
	},
	
	checkNom : function(val, obj) {
		if (!val || val.length < 4)
			return "Le nom doit avoir plus de 3 caractères";
		var code = this.codeContact;
		var x = this.cell.getContactOfInitiales(val)
		if (x && x.code != code)
			return "Le nom a déjà été attribué au code " + x.code;
		return null;
	},
	
	checkInitiales : function(val, obj) {
		if (!val)
			return "Les initiales sont obligatoires";
		var d = Util.checkInitiales(val);
		if (d) 
			return d;
		var code = this.codeContact;
		var x = this.cell.getContactOfInitiales(val)
		if (x && x.code != code)
			return "Les initiales ont déjà été attribuées au code " + x.code;
		return null;
	},
	
	enregistrer : function() {
		var arg = {op:"22"};
		if (this.cell.isGAC)
			arg.gac = this.cell.code;
		else
			arg.gap = this.cell.code;
		arg.code = this.elt.code;
		var x = this.MC.valEd("nom");
		if (x != null)
			arg.nom = x;
		var x = this.MC.valEd("color");
		if (x != null)
			arg.couleur = x;
		x = this.MC.valEd("initiales");
		if (x != null)
			arg.initiales = x.toUpperCase();
		x = this.MC.valEd("localisation");
		if (x != null)
			arg.localisation = x;
		x = this.MC.valEd("confidentialite");
		if (x != null)
			arg.confidentialite = x;
		x = this.MC.valEd("postitContact");
		if (x != null)
			arg.postitContact = x;
//		x = this.MC.valEd("bienvenue");
//		if (x != null)
//			arg.bienvenue = x;
		x = this.MC.valEd("email1");
		if (x != null)
			arg.email1 = x;
		x = this.MC.valEd("novol");
		if (x != null)
			arg.novol = x ? 1 : 0;
		x = this.MC.valEd("unclic");
		if (x != null)
			arg.unclic = x ? 1 : 0;
		x = this.MC.valEd("aContacter");
		if (x != null)
			arg.aContacter = x ? 1 : 0;
		x = this.MC.valEd("nomail");
		if (x != null)
			arg.nomail = x ? 1 : 0;
		x = this.MC.valEd("telephones");
		if (x != null)
			arg.telephones = x;
		x = this.MC.valEd("ordreCheque");
		if (x != null)
			arg.ordreCheque = x;
		x = this.MC.valEd("derniereCotis");
		if (x != null)
			arg.derniereCotis = x;
		x = this.MC.valEd("adherent");
		if (x != null)
			arg.adherent = x;
	
		x = this.MC.valEd("groupements");
		if (x != null)
			arg.groupements = x;
	
		x = this.MC.valEd("grExcl");
		if (x != null)
			arg.grExcl = x;
	
		arg.operation = "Enregistrement";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this.close();
			AC.Message.info("Enregistrement fait");
		}, "Echec de l'enregistrement : ");
	}

}
AC.declare(AC.FormContactS, AC.SmallScreen);

/***********************************************************************/
AC.FormSecurite = function(grpCell, contact){
	this.init(grpCell, contact);
};
AC.FormSecurite._static = {

html : "<div data-ac-id='pwds'>"
	+ "<div class='acBtnValider1' data-ac-id='enregPwd'>Enregistrer</div>"
	+ "<div class='bold italic' data-ac-id='princip'>" 
	+ "<div>Mot de passe principal (au moins 4 signes, sans espaces, ne commence pas par 0): </div>"
	+ "<div><input type='text' data-ac-id='pwd'></input></div></div>"
	+ "<div class='bold italic' data-ac-id='second'><div>Mots de passe secondaires, séparés par "
	+ " des espaces (* pour les supprimer tous): </div>" 
	+ "<div><input type='text' data-ac-id='pwd2'></input></div></div>"
	+ "<div class='acEnd'></div></div>"
	
	+ "<div data-ac-id='genCle' class='acSpace1B'>"
	+ "<div class='acBtnValider1' data-ac-id='generer'>Générer</div>"
	+ "<div>La \"clé générée\" est utilisé dans les e-mails de synthèse.<br>"
	+ "Elle permet d'effectuer avec une relative sécurité le désabonnement à ces mails "
	+ "et la suppression des droits d'accès en 1 clic sans demander un mot de passe.<br>"
	+ "Dans les accès en 1 clic de ces e-mails, la clé générée se substitue au mot de passe.<br>"
	+ "Il n'y a lieu de régénérer une nouvelle clé que s'il y a présomption que les "
	+ "e-mails de synthèse aient été accédés / copiés par des personnes qui n'auraient pas du y avoir accès.</div>"
	+ "Lire l'aide en ligne de ce panneau pour en savoir d'avantage (l'icône I en haut à droite).<br>"
	+ "Appuyer sur le bouton \"Générer\" pour générer une nouvelle clé."
	+ "<div class='acEnd'></div></div>"

	+ "<div data-ac-id='resilier' class='acSpace1B'>" 
	+ "<div class='acBtnValider1' data-ac-id='inactiver'>Résilier</div>"
	+ "<div class='bold italic'>Résilier l'accès à l'application.</div>"
	+ "<div class='acEnd'></div></div>"

	+ "<div data-ac-id='retablir' class='acSpace1B'>"
	+ "<div class='acBtnValider1' data-ac-id='activer'>Rétablir</div>"
	+ "<div class='bold italic'>Rétablir l'accès à l'application.</div>"
	+ "<div class='acEnd'></div></div>"

}
AC.FormSecurite._proto = {

init : function(grpCell, contact) {
	this.className = "FormSecurite";
	this.cell = grpCell;
	this.code = this.cell.code;
	this.type = this.cell.constructor.type;
	this.contact = contact;
	this.contact = this.contact == 1 ? 0 : this.contact;
	this.elt = !this.contact ? this.cell.getContact(1) : this.cell.getContact(this.contact);
	this.cell.attach(this);
	
	var t = new StringBuffer();
	t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
	t.append(AC.FormSecurite.html);
	AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), null, true, 
			this.elt.nom.escapeHTML() + "<br>Données de sécurité");

	this._pwds = APP.id(this, "pwds");
	this._princip = APP.id(this, "princip");
	this._second = APP.id(this, "second");
	this._resilier = APP.id(this, "resilier");
	this._retablir = APP.id(this, "retablir");
	this._genCle = APP.id(this, "genCle");
	
	var mc = new AC.MC("FormSecurite", this);
	mc.addVar("contact", "c");
	mc.addVar("pwd2", "g", this.checkPwd2);
	mc.addVar("pwd", "g", this.checkPwd);
	mc.addExpr("hasContact", {c:"contact", v:"_second"}, "v.css('display', (c ? 'none' : 'block'))");
	mc.checkAll(function(){	});
	mc.addInput("pwd", "pwd");
	mc.addInput("pwd2", "pwd2");
	mc.addExpr("diag", {e:"error", v:"_diag"}, "Util.text(v, e ? e :'')");
	mc.addHtml("enregPwd", this.enregistrer);
	mc.addExpr("enEnreg", {er:"error", ed:"edited", v:"_enregPwd"}, "var b=ed && !er; Util.btnEnable(v,b)");
	this.reset();
	APP.oncl(this, "generer", function(){
		this.cell.genererCle(this.elt.code);
	});
	APP.oncl(this, "inactiver", this.activer);
	APP.oncl(this, "activer", this.activer);
	
	this.show();
},

reset : function(){
	this.modePwd = false;
	this.elt = !this.contact ? this.cell.getContact(1) : this.cell.getContact(this.contact);
	if ((APP.Ctx.authRole == 4 || APP.Ctx.authRole == 6) || APP.Ctx.authUsr == 1){
		this._genCle.css("display", "block");
		if (!this.contact){
			this._resilier.css("display", "none");
			this._retablir.css("display", "none");
			if (APP.Ctx.authPower <= 1){
				this._pwds.css("display", "block");
				this._princip.css("display", "block");
				this._second.css("display", "block");
				this.modePwd = true;
			} else {
				this._pwds.css("display", "none");
			}
		} else {
			this._pwds.css("display", "block");
			this._princip.css("display", "block");
			this.modePwd = true;
			this._second.css("display", "none");
			if (this.elt.suppr) {
				this._resilier.css("display", "none");
				this._retablir.css("display", "block");
			} else {
				this._resilier.css("display", "block");
				this._retablir.css("display", "none");			
			}
		}
	} else {
		if (APP.Ctx.authPower <= 3){
			this._pwds.css("display", "block");
			this._princip.css("display", "block");
			this.modePwd = true;
			this._second.css("display", "none");
			this._genCle.css("display", "block");
		} else {
			this._pwds.css("display", "none");
			this._genCle.css("display", "none");
		}
		this._resilier.css("display", "none");
		this._retablir.css("display", "none");
	}
	this.MC.begin().set("pwd2", null).set("pwd", null).sync("c", this).commit();
},

close: function(){
	this.cell.detach(this);
	AC.SmallScreen.prototype.close.call(this);
},

onCellsChange : function(cells){
	this.reset();
},


checkPwd : function(val, valObj) {
	if (!this.modePwd || !val)
		return null;
	this.pwd = null
	var d = Util.checkPwd(val, 0);
	if (d)
		return d;
	else
		this.pwd = APP.Ctx.getPwd(val, this.type, this.code);
	return null;
},

checkPwd2 : function(val, valObj) {
	if (!this.modePwd || !val)
		return null;
	if ("*" == val) {
		this.pwd2 = "*";
	} else {
		this.pwd2 = null;
		var pwds = val ? val.split(" ") : [];
		if (pwds.length == 0)
			return;
		var pwd2s = [];
		for ( var i = 0, x = ""; x = pwds[i]; i++) {
			var d = Util.checkPwd(x, i + 1);
			if (d)
				return d;
			else
				pwd2s.push(APP.Ctx.getPwd(x, this.type, this.code));
		}
		this.pwd2 = pwd2s.join(" ");
	}
	return null;
},

activer : function() {
	this.cell.activerContact(this.elt.code);
},

genCle : function(){
	this.cellGrp.genererCle(this.apc);
},

enregistrer : function(){
	if (this.contact) {
		if (this.pwd) {
			var arg = {op:"25"};
			if (this.type == 1) {
				arg.gac = this.code;
			} else {
				arg.gap = this.code;
			}
			arg.pwd = this.pwd;
			arg.code = this.contact;
			arg.operation = "Changement du mot de passe";
			AC.Req.post(this, "alterconsos", arg, function(data) {
				AC.Message.info("Changement fait");
				if (APP.Ctx.authUsr == arg.code)
					APP.Ctx.authPwd = arg.pwd;
			}, "Echec du changement : ");
		}
	} else {
		var arg = {op:"85"};
		arg.type = this.type;
		arg.code = this.code;
		if (this.pwd2)
			arg.pwd2 = this.pwd2 == "*" ? "" : this.pwd2;
		if (this.pwd)
			arg.pwd = this.pwd;
		arg.operation = "Changement des mots de passe";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			if (arg.pwd)
				APP.Ctx.authPwd = arg.pwd;
			AC.Message.info("Changement effectué");
		}, "Echec du changement : ");
	}
}

}
AC.declare(AC.FormSecurite, AC.SmallScreen);

/** ******************************************************** */
AC.NouveauContact = function(grpCell){
	this.init(grpCell);
}
AC.NouveauContact._static = {

html : "<div data-ac-id='nouveauContact' class='ac-nouveau'>" 
		+ "<div class='bold italic'>Nom :</div>"
		+ "<input type='text' data-ac-id='nouveauContactInput'></input>"
		+ "<div class='bold italic'>Initiales :</div>"
		+ "<input type='text' data-ac-id='nouveauContactInput2'></input>"
		+ "<div data-ac-id='diag' class='bold ac-tweet-red'></div>"
		
		+ "<div class='ac-space1rem' data-ac-id='direct'></div></div>"

}
AC.NouveauContact._proto = {
init : function(grpCell) {
	this.className = "NouveauContact";
	this.cell = grpCell;
	this.tprod = this.cell.isGAC ? 0 : 1;
		
	var t = new StringBuffer();
	t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
	t.append(AC.NouveauContact.html);
	AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Créer", true, 
			"Nouveau contact");
	
	this._direct = APP.id(this, "direct");

	if (this.tprod) {
		new AC.CheckBox2(this, "direct", "Producteur payé <span class='red'>DIRECTEMENT</span> (pas par le groupement)");
		this._direct.val(false);
		var self = this;
		this._direct.jqCont.off("dataentry").on("dataentry", function() {
			self.tprod = self._direct.val() ? 2 : 1;
		});
	} else
		this._direct.css("display", "none");
	
	this._nouveauContactInput = this._content.find("[data-ac-id='nouveauContactInput']");
	this._nouveauContactInput.val("");
	this._nouveauContactInput2 = this._content.find("[data-ac-id='nouveauContactInput2']");
	this._nouveauContactInput2.val("");
	this._nouveauDiag = this._content.find("[data-ac-id='diag']");
	this._nouveauDiag.html("");

	this.show();
},

enregistrer : function() {
	var n = this._nouveauContactInput.val();
	var val = this._nouveauContactInput2.val();
	var diag = this._nouveauDiag;
	if (val) {
		var d = Util.checkInitiales(val);
		if (d) {
			diag.html(d);
			return;
		}
		var elt2 = this.cell.getContactOfInitiales(val);
		if (elt2) {
			diag.html("Initiales déjà attribuées au code " + elt2.code);
			this._nouveauContactInput2.val("");
			return;
		}
	}

	if (!n || n.length < 4) {
		diag.html("Un nom doit avoir au moins 4 caractères");
		return;
	}
	var elt = this.cell.getContactOfNom(n);
	if (elt) {
		diag.html("Nom déjà attribué au code " + elt.code);
		this._nouveauContactInput.val("");
		return;
	}
	var arg = {op:"21"};
	var x = "réation d'un ";
	if (this.cell.isGAC) {
		arg.gac = this.cell.code;
		x = x + "alterconso";
	} else {
		arg.gap = this.cell.code;
		x = x + "producteur";
	}
	if (this.tprod == 1) {
		arg.min = 1;
		arg.max = 99;
	} else if (this.tprod == 2) {
		arg.min = 100;
		arg.max = 199;
	}
	arg.nom = n;
	arg.initiales = val;
	arg.operation = "C" + x;
	AC.Req.post(this, "alterconsos", arg, function(data) {
		this._nouveauContactInput.val("");
		var code = this.cell.codeDeNom(arg.nom);
		if (this.cell.isGAC) {
			AC.StackG.show({type:"Ac", ac:code, gac:arg.gac});
		} else {
			AC.StackG.show({type:"Ap", ap:code, gap:arg.gap});
		}
		this.close()
	}, "Echec de la c" + x + " : ");
}

}
AC.declare(AC.NouveauContact, AC.SmallScreen);

/** **************************************************************** */
AC.ExportXLS = function(date, initiales) {
	this.init(date, initiales);
}
AC.ExportXLS._static = {

html2 : "<div class='bold italic ac-photolabel'>" 
	+ "Pour exporter un fichier XLS personnalisé pour un groupe donné, "
	+ "le sélectionner ci-dessous. Sinon la feuille générée sera \"générale\" pour tous groupes.</div>"
	+ "<div class='ac-space1rem' data-ac-id='gac'>"
	+ "<div class='acdd-label italic'>Groupe : </div>"
	+ "<div class='acdd-box2  aclogbox' data-ac-id='selectgac'></div></div>" 
}
AC.ExportXLS._proto = {
	init : function(date, initiales){
		this.className = "ExportXLS";
		this.date = date;
		this.initiales = initiales;
		this.gac = 0;
		
		var t = new StringBuffer();
		t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
		t.append(this.constructor.html2);
		AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Exporter", true, 
				"Exportation en feuille Excel");

		this._selectgac = this._content.find("[data-ac-id='selectgac']");
		var self = this;
		this._selectgac.parent().off(APP.CLICK).on(APP.CLICK, function(event) {
			APP.NOPROPAG(event);
			var lib = "<div class='acdd-itemValue color16 bold'>NON spécifique à un groupe</div>"
			AC.DD2.register(self._selectgac, 
					APP.Ctx.dir.decor(1, lib, function(elt){
						return !elt.removed;
					}, true), true, function(x) {
						self.gac = x.code;
					});
		});
		this._selectgac.val(0);
		
		this.show();
	},
	
	enregistrer : function(){
		if (this.gac)
			var elt = APP.Ctx.dir.getElement(1, this.gac);
		var initgac = elt ? elt.initiales : "MONGROUPE";
		AC.Req.submitForm("53", "alterconsos/export/AC_" + this.date + "_" + this.initiales 
				+ "_" + initgac + ".xls", this.date, null, this.gac);
	}
	
}
AC.declare(AC.ExportXLS, AC.SmallScreen);

/** **************************************************************** */
AC.ExportStatsXLS = function(initiales) {
	this.init(initiales);
}
AC.ExportStatsXLS._static = {

html2 : "<div class='bold italic'>" 
	+ "Les statistiques sont exportées en Excel pour 12 mois consécutifs.<br>"
	+ "Donner ci-dessous l'année et le mois du premier mois à faire figurer dans l'exportation.</div>"
	+ "<div class='acSpace2'></div>"
	+ "<div class='acLabel'>Année du premier mois (2013 ...)</div><div class='acEntry'>"
	+ "<input type='number' id='annee' data-ac-id='annee' /></div>"
	+ "<div class='acLabel'>Premier mois (de 1 à 12)</div><div class='acEntry'>"
	+ "<input type='number' id='mois' data-ac-id='mois' /></div>"

}
AC.ExportStatsXLS._proto = {
	init : function(initiales){
		this.className = "ExportStatsXLS";
		this.initiales = initiales;
		AC.AMJ.getTime();
		var aj = AC.AMJ.aujourdhui;
		this.aaaa = Math.floor(aj / 10000) + 2000;
		this.elt = {annee:this.aaaa, mois:9}
		
		var t = new StringBuffer();
		t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
		t.append(this.constructor.html2);
		AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Exporter", true, 
				"Exportation des statistiques en Excel");
		
		var mc = new AC.MC("AC.ExportStatsXLS", this);
		mc.addVar("annee", "elt", this.checkAnnee).addVar("mois", "elt", this.checkMois);
		mc.addHtml("valider", this.enregistrer);
		mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
		mc.addExpr(0, {e : "edited", x : "error", v:"_valider"}, 
			"var b =e && !x; Util.btnEnable(v,b)");
		
		mc.addInput("annee", "annee");
		mc.addInput("mois", "mois");
		this.MC.begin().sync("elt", this.elt).commit();

		this.show();
	},
	
	checkAnnee : function(val, obj) {
		try {
			this.annee = parseInt(val, 10);
			if (this.annee < 2013 || this.annee > this.aaaa)
				return "Année incorrecte : elle doit être un nombre entre 2013 et " + this.aaaa + ".";
			else
				return null;
		} catch(e){
			return "Année incorrecte : elle doit être un nombre entre 2013 et " + this.aaaa + ".";
		}
	},

	checkMois : function(val, obj) {
		try {
			this.mois = parseInt(val, 10);
			if (this.mois < 1 || this.mois > 12)
				return "Mois incorrect : il doit être un nombre entre 1 et 12.";
			else
				return null;
		} catch(e){
			return "Mois incorrect : il doit être un nombre entre 1 et 12.";
		}
	},

	enregistrer : function(){
		var aa = this.annee % 100;
		this.date = (aa * 10000) + (this.mois * 100) + 1;
		AC.Req.submitForm("61", "alterconsos/export/AC_STATS_" + this.date + "_" + this.initiales 
				+ ".xls", this.date);
	}
	
}
AC.declare(AC.ExportStatsXLS, AC.SmallScreen);

/** **************************************************************** */
AC.FormXLS = function(date, fromGap){
	this.init(date, fromGap);
}
AC.FormXLS._static = {
//
html1 : "<div class='bold italic ac-photolabel'>" 
	+ "Pour importer une commande d'un alterconso, choisir un fichier .xls "
	+ "(format Microsoft Excel 97/2000/XP) ou .xlsx (2007 ...)</div>"
	+ "<div data-ac-id='fileX'></div>"
	+ "<div class='ac-sep1rem' data-ac-id='log' style='min-height:20rem'></div>",

html2 : "<div class='bold italic ac-photolabel'>" 
	+ "Pour importer une commande d'un groupe, choisir un fichier .xls "
	+ "(format Microsoft Excel 97/2000/XP) ou .xlsx (2007 ...)</div>"
	
	+ "<div class='ac-space1rem' data-ac-id='gac'>"
	+ "<div class='acdd-label italic'>Groupe : </div>"
	+ "<div class='acdd-box2  aclogbox' data-ac-id='selectgac'></div></div>"

	+ "<div data-ac-id='fileX'></div>"
	+ "<div class='ac-sep1rem' data-ac-id='log' style='min-height:20rem'></div>"

}
AC.FormXLS._proto = {

	init : function(date, fromGap) {
		this.className = "FormXLS";
		this.fromGap = fromGap;
		if (fromGap)
			this.gapInit = APP.Ctx.dir.getElement(2, APP.Ctx.authGrp).initiales;
		this.date = date;
		this.cible = 0;
		
		var hb = new StringBuffer();
		hb.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
		
		if (!window.FileReader) {
			if (AC.dbg)
				AC.info("FileReader not implemented !");
			hb.append("<div class='bold italic'>" + "Désolé ce navigateur ne supporte pas cette fonction, "
					+ "utiliser la page simple d'importation</div>");
	
			AC.SmallScreen.prototype.init.call(this, 600, hb.append("</div>").toString(), null, true, 
				"Importation de feuille Excel");
			this.show();
			this.setDiag("Désolé ce navigateur ne supporte pas cette fonction, utiliser la page simple d'importation");
			return;
		}
	
		if (!fromGap)
			hb.append(this.constructor.html1);
		else
			hb.append(this.constructor.html2);

		AC.SmallScreen.prototype.init.call(this, 600, hb.append("</div>").toString(), "Importer", true, 
			"Importation de feuille Excel");
	
		this._log = APP.id(this, "log");
	
		var self = this;
		
		if (fromGap){
			this._gac = this._content.find("[data-ac-id='gac']");
			this._pwd = this._content.find("[data-ac-id='pwd']");
			this._selectgac = this._content.find("[data-ac-id='selectgac']");
			this._selectgac.parent().off(APP.CLICK).on(APP.CLICK, function(event) {
				APP.NOPROPAG(event);
				AC.DD2.register(self._selectgac, APP.Ctx.dir.decor(1, null, function(elt){
					return !elt.removed;
				}, true), true, function(x) {
					self.setGac(x.code);
				});
			});
		}
		
		this.resetFile();
		this.show();
	},
	
	setGac : function(code){
		this.cible = code;
		this.gacInit = APP.Ctx.dir.getElement(1, this.cible).initiales;
		this.enable();
	},
	
	resetFile : function(){
		if (this.fromGap) {
			this.cible = 0;
			this._selectgac.html("");
		}
		this.enable();
		var self = this;
		var _fileX = APP.id(this, 'fileX');
		_fileX.html("<input data-ac-id='file' name='file' type='file'></input>");
		var _file = APP.id(this, 'file');
		_file[0].addEventListener("change", function() {
			AC.Req.handleFile(this.files, function(content, name, type, pfx) {
				self.fichierChoisi(content, name, type, pfx);
			}, true);
		}, false);
	},
	
	fichierChoisi : function(content, name, type) {
		this.setDiag("", true);
		Util.btnEnable(this._valider, false);
		this._log.html("");
		if (content == null){
			this.setDiag("Fichier illisible : " + name + "[" + type + "]");
			this.enable();
			return;
		}

		var s1 = AC.AMJ.nbs(this.date);
		var td = [];
		td.push(0);
		for (var i = 1; i <= 7; i++)
			td.push(AC.AMJ.aammjj2(s1, i));
		
		if (this.fromGap){
			var ok = false;
			for(var i = 1, d = 0; d = td[i]; i++) {
				var fnx = "AC_" + d + "_" + this.gapInit + "_" + (this.gacInit ? this.gacInit : "");
				if ((name.endsWith(".xls") || name.endsWith(".xlsx")) && name.startsWith(fnx))
					ok = true;
			}
			if (!ok) {
				var fnx = "AC_" + this.date + "_" + this.gapInit + "_" + (this.gacInit ? this.gacInit : "");
				this.setDiag("Le fichier choisi n'est pas celui attendu : son nom devrait commencer par "
						+ fnx + " et se terminer par .xls ou .xslx]");
				this.enable();
				return;
			}
		} else {
			var ok = false;
			for(var i = 1, d = 0; d = td[i]; i++) {
				var fnx = "AC_" + d + "_";
				if ((name.endsWith(".xls") || name.endsWith(".xlsx")) && name.startsWith(fnx))
					ok = true;
			}
			if (!ok) {
				var fnx = "AC_" + this.date + "_";
				this.setDiag("Le fichier choisi n'est pas celui attendu : son nom devrait commencer par " 
						+ fnx + " et se terminer par .xls ou .xslx]");
				this.enable();
				return;
			}
			
		}
		var i = content.indexOf(",");
		if (i == -1 || i >= content.length){
			this.setDiag("Le fichier choisi semble vide");
			this.enable();
			return;		
		}
		this.content = content.substring(i+1);
	
		this.fname = name;
		if (AC.dbg)
			AC.info("Fichier lu du disque :" + name);
		this.enable();
	},
	
	enEdition : function() {
		if (!this.fromGap)
			return this.fname;
		return this.fname || this.cible;
	},
	
	enErreur : function() {
		if (!this.fromGap)
			return !this.fname;
		return !this.fname || !this.cible;
	},
	
	enregistrer : function() {
		if (!this.enEdition() || this.enErreur())
			return;
		this.setDiag("", true);
		var arg = {op:"56", _isRaw:true};
		if (this.fromGap)
			arg.cible = this.cible;
		arg.xls = this.content;
		arg.operation = "Importation " + this.fname;
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this.fname = null;
			Util.btnEnable(this._valider, false);
			this.error = false;
			this.resetFile();
			this._log.html(data.escapeHTML());
			AC.Req.sync();
		}, function(error) {
			this.fname = null;
			Util.btnEnable(this._valider, false);
			this.error = false;
			this.resetFile();
			AC.Message.error("Echec de l'importation : " + error.shortText);
			this._log.html("");
		});
	}

}
AC.declare(AC.FormXLS, AC.SmallScreen);

/** **************************************************************** */
AC.FormMail2 = function(){}
AC.FormMail2._static = {
		
html : "<div class='acsTabs acsTabBar'><div class='acTab2 acsTabX bold' data-ac-id='itab1' data-index='1'>" 
	+ "Personnaliser les e-mails hebdo"
	+ "</div><div class='acTab2 acsTabX acsTabSel bold'  data-ac-id='itab2' data-index='2'>"
	+ "Envoyer des e-mails"
	+ "</div></div>"

	+ "<div class='acsTabBody'><div data-ac-id='tab1'>"
	+ "<div class='bold talc' data-ac-id='applic'></div>"
	+ "<div class='acLabel'>"
	+ "Sujet facultatif des e-mails de synthèse hebdomadaire<br>"
	+ "Par défaut c'est \"Synthèse hebdomadaire alterconsos\"</div><div class='acEntry'>"
	+ "<input data-ac-id='bienvenueS'></div>"
	+ "<div class='acLabel'>"
	+ "Texte facultatif à insérer en tête des e-mails de synthèse hebdomadaire<br>"
	+ "<b>Si c'est du HTML, frapper @ en tout premier caractère.</b></div><div class='acEntry'>"
	+ "<textarea style='height:10rem' data-ac-id='bienvenueT'></textarea></div>"
	+ "<div data-ac-id='enreg' class='acBtnValider1'>Enregistrer</div>"
	+ "<div>Pour enregistrer les changements ou <b>en prolonger la validité</b> "
	+ " pour une semaine à partir d'aujourd'hui, appuyer su \"Enregistrer\".</div>"
	+ "<div class='acEnd'></div></div>"

	+ "<div data-ac-id='tab2'><div class='bold italic'>" 
	+ "Envoi immédiat d'e-mails au Groupe / Groupement</div>"
	+ "<div class='acLabel'>Envoyer seulement à cet alterconso ou producteur (sinon tous)</div>"
	+ "<div class='acEntry'><div class='acdd-box'>"
	+ "<div class='acdd-value2 italic' data-ac-id='selectusr'></div></div></div>"
	+ "<div class='acLabel'>Sujet du mail (facultatif, sinon c'est \"Synthèse Hebdomadaire Alterconsos\")</div><div class='acEntry'>"
	+ "<input type='text' data-ac-id='subject' /></div>"
	+ "<div class='acLabel'>Ce texte est facultatif : s'il est présent il s'affichera en tête"
	+ " du mail.<br><b>Si c'est du HTML, frapper @ en tout premier caractère.</b></div><div class='acEntry'>"
	+ "<textarea style='height:10rem' data-ac-id='text'></textarea></div>"
	+ "<div data-ac-id='envoyer' class='acBtnValider1'>Envoyer</div>"
	+ "<div class='acEnd'></div><div class='acSpace105B'></div>"
	+ "<div data-ac-id='res' class='acSpace2'></div>"
	+ "<a data-ac-id='mailto1'></a><br>"
	+ "<a data-ac-id='mailto2'></a>"
	+ "<div class='acSpace2 bold large'>Statistique du dernier lot de messages envoyés</div>"
	+ "<div data-ac-id='statsMail'></div>"
	+ "<div class='acSpace2 bold large'>Trace détaillée des derniers messages envoyés à chacun</div>"
	+ "<div data-ac-id='traceMail'></div>"
	+ "</div><div class='filler'></div></div>"

}
AC.FormMail2._proto = {

	init : function() {
		this.className = "FormMail2";
		this.dt = AC.ac2.viewDT;
		this.usr = 0;
		this.statsMail = AC.StatsMail.getN();
		this.statsMail.attach(this);
		this.traceMail = AC.TraceMail.getN();
		this.traceMail.attach(this);
		APP.Ctx.loginGrp.attach(this);
		this.usr1 = APP.Ctx.loginGrp.get(1);
		AC.Req.sync();
		
		AC.SmallScreen.prototype.init.call(this, -900, AC.FormMail2.html, null, true, 
				"Envoi d'un e-mail ou d'un lot d'e-mails");
		
		this._content.css("overflow-y", "hidden");
		this._content.css("position", "relative");
		
		this._tab1 = APP.id(this, "tab1");
		this._tab2 = APP.id(this, "tab2");
		this._itab1 = APP.id(this, "itab1");
		this._itab2 = APP.id(this, "itab2");

		this._applic = APP.id(this, "applic");
		this._subject = APP.id(this, "subject");
		this._text = APP.id(this, "text");
		this._mailto1 = APP.id(this, "mailto1");
		this._mailto2 = APP.id(this, "mailto2");
		this._res = APP.id(this, "res");
		this._statsMail = APP.id(this, "statsMail");
		this._traceMail = APP.id(this, "traceMail");
		this.mailTo2();
		this.mailTo1();
		this.bienvenueT = APP.Ctx.loginGrp.getContact(1).bienvenueT;
		
		var tous = "<div class='acdd-itemValue color0 bold'>Tous</div>";
		var decor = APP.Ctx.loginGrp.decor(tous, null, true);
		new AC.Selector3(this, "selectusr", decor, "(tous)");
	
		var mc = new AC.MC("FormMail", this);
		mc.addVar("usr", "c");
		mc.addVar("bienvenueT", "usr1");
		mc.addVar("bienvenueS", "usr1");
		mc.addHtml("envoyer", this.envoyer);
		mc.addHtml("enreg", this.enregistrer);
		mc.addRich("selectusr", "usr");
		mc.addInput("bienvenueT", "bienvenueT");
		mc.addInput("bienvenueS", "bienvenueS");
		mc.checkAll(function(){
			var c = this.MC.val("usr");
			this.mailTo1(c);
		})
		//mc.begin().sync("c", this).sync("usr1", this.usr1).commit();
		this.onCellGrp();
		
		this.displaySM();
		this.displayTM();
		
		this.show();
		AC.oncl(this, this._content.find(".acTab2"), function(target){
			var i = Util.dataIndex(target);
			var j = i == 1 ? 2 : 1;
			this["_tab" + i].css("display", "block");
			this["_itab" + i].addClass("acsTabSel");
			this["_tab" + j].css("display", "none");
			this["_itab" + j].removeClass("acsTabSel");
		});
		this._tab1.css("display", "none");
	},
	
	onCellGrp : function(){
		var bj = this.usr1.bienvenueJ;
		if (bj) {
			var dl = AC.AMJ.dateLongue(bj);
			var v = bj > AC.AMJ.aujourdhui ? "sont" : "étaient";
			this._applic.html("Les valeurs affichées " + v + " applicables aux e-mails de "
				+ " synthèse émis jusqu'à <span class='red'>" + dl + "</span> inclus");
		} else {
			this._applic.html("Aucun sujet ni texte enrégistré");
		}
		this.MC.begin().sync("c", this).sync("usr1", this.usr1).commit();
	},

	mailTo2 : function() {
		if (APP.Ctx.authType != 2 || !this.dt) {
			this._mailto2.css("display", "none");
		} else {
			this._mailto2.html("Ouvrir l'application par défaut d'envoi de mails de votre système "
				+ "pour envoi <b>AUX ANIMATEURS DE TOUS LES GROUPES</b>");
			var em = [];
			var mailto = APP.Ctx.loginGrp.getCEmails(1).replace(/ /g, '%20');
			for(var gac in this.dt.sLivrG)
				em.push(this.dt.sLivrG[gac].cellGac.getCEmails(1));
			var s = em.join(",").replace(/ /g, '%20');
			if (s)
				this._mailto2.attr("href", "mailto:" + mailto + "?bcc=" + s);
			else
				this._mailto2.css("display", "none");
		}
	},
	
	mailTo1 : function(c) {
		var mailto = APP.Ctx.loginGrp.getCEmails(1).replace(/ /g, '%20');
		var s = APP.Ctx.loginGrp.getEmails(c).replace(/ /g, '%20');
		this._mailto1.attr("href", "mailto:" + mailto + "?bcc=" + s);
		if (!c)
			var z = APP.Ctx.authType != 2 ? "<b> A TOUS LES ALTERCONSOS DU GROUPE.</b>" 
					: "<b> A TOUS LES PRODUCTEURS DU GROUPEMENT.</b>";
		else
			var z = "à " + APP.Ctx.loginGrp.get(c).nom;
		this._mailto1.html("Ouvrir l'application par défaut d'envoi de mails de votre système pour envoi " + z);
	},
	
	enEdition : function() {
		return false;
	},
	
	enErreur : function() {
		return false;
	},
	
	close : function(){
		if (this.statsMail)
			this.statsMail.detach(this);
		if (this.traceMail)
			this.traceMail.detach(this);
		APP.Ctx.loginGrp.detach(this);
		AC.SmallScreen.prototype.close.call(this);
	},
	
	onCellsChange : function(cells){
		for(var i = 0, c = null; c= cells[i]; i++){
			if (c == this.statsMail) {
				this.displaySM();
			}
			if (c == this.traceMail) {
				this.displayTM();
			}
			if (c == APP.Ctx.loginGrp) {
				this.onCellGrp();
			}
		}
	},
	
	displaySM : function(){
		this._statsMail.html(this.statsMail.edit());
	},

	displayTM : function(){
		this._traceMail.html(this.traceMail.edit());
	},

	envoyer : function() {
		this._res.html("");
		var arg = {op:"55", _isRaw:true};
		var usr = this.MC.valEd("usr");
		if (usr)
			arg.usr = usr;
		arg.operation = "Demande d'envoi immédiat de mails";
		var x = this._subject.val();
		if (x)
			arg.subject = x;
		var x = this._text.val();
		if (x)
			arg.text = x;
		AC.Req.post(this, "alterconsos", arg, function(data) {
			if (data) {
				var cl = data.startsWith("OK") ? "bold italic" : "red bold large";
				var msg = "<div class='" + cl + "'>" + data.escapeHTML() + "</div>";
			} else
				var msg = "<div class='bold italic'>Pour suivre l'évolution des envois de messages, resynchroniser toutes "
					+ "les 10 secondes.</div>";
			this._res.html(msg);
			if (usr) {
				AC.Req.sync();
			} else {
				setTimeout(function(){
					AC.Req.sync();
				}, 5000)
			}
		}, "Demande d'envoi en échec : ");
	},
	
	enregistrer : function() {
		var arg = {op:"22"};
		if (APP.Ctx.loginGrp.isGAC)
			arg.gac = APP.Ctx.authGrp;
		else
			arg.gap = APP.Ctx.authGrp;
		arg.code = 1;
		var x = this.MC.val("bienvenueT");
		arg.bienvenueT = x ? x : "";
		x = this.MC.val("bienvenueS");
		arg.bienvenueS = x ? x : "";
		arg.bienvenueJ = AC.AMJ.jPlusN(AC.AMJ.aujourdhui, 7);
		arg.operation = "Enregistrement du texte de bienvenue";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			this.bienvenue = APP.Ctx.loginGrp.getContact(1).bienvenue;
			this.MC.begin().sync("c", this).commit();
			AC.Message.info("Enregistrement fait");
		}, "Echec de l'enregistrement : ");
	}
}
AC.declare(AC.FormMail2, AC.SmallScreen);

/** **************************************************************** */
AC.FormPhoto2 = function(cell, code){
	this.init(cell, code);
}
AC.FormPhoto2._static = {

	html : "<div class='bold italic ac-photolabel'>" 
		+ "Pour changer la photo, choisir un fichier JPEG local</div>"
		+ "<div><input data-ac-id='file' name='file' type='file'></input></div>"
		+ "<div class='ac-phototest'><img class='ac-phototestImg' data-ac-id='phototest'></img></div>"

}
AC.FormPhoto2._proto = {

	init : function(cell, code) {
		if (!window.FileReader) {
			if (AC.dbg)
				AC.info("FileReader not implemented !");
			AC.Message.diag("Désolé ce navigateur ne supporte pas cette fonction",true);
			return;
		}

		this.className = "FormPhoto2";
		this.cell = cell;
		this.codeContact = code;
		
		var hb = new StringBuffer();
		hb.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");

		hb.append(this.constructor.html);
		
		AC.SmallScreen.prototype.init.call(this, 600, hb.append("</div>").toString(), "Valider", true, 
			"Changement de photo");

		Util.btnEnable(this._valider, false);
	
		this._phototest = this._content.find("[data-ac-id='phototest']");
		this.loc = {l : this.cell.line, c : this.codeContact + ".", t : "PHOTO"}
		this._phototest.attr("src", null);
		var self = this;
		var photo = this._content.find("[data-ac-id='file']");
		photo[0].addEventListener("change", function() {
			AC.Req.handleFile(this.files, function(content, name, mime) {
				self.fichierChoisi(content, name, mime);
			});
		}, false);
		
		this.show();
	},
	
	fichierChoisi : function(content, name, mime) {
		this.fname = name;
		this.mime = mime;
		this.content = content;
		if (AC.dbg)
			AC.info("Fichier lu du disque :" + name);
		this._phototest.attr("src", this.content);
		this.setDiag("La photo sera retaillée pour être carrée et allégée (64 x 64 pixels)", true);
		Util.btnEnable(this._valider, true);
	},
	
	enEdition : function() {
		return this.fname;
	},
	
	enErreur : function() {
		return false;
	},
	
	enregistrer : function() {
		var arg = {op:"10"};
		arg.l = this.loc.l;
		arg.c = this.loc.c;
		arg.t = this.loc.t;
		arg.content = this.content;
		arg.mime = this.mime;
		arg.operation = "Enregistrement de la photo";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Changement de photo enregistré");
			this.name = null;
			this.close();
		}, "Changement de photo en erreur : ");
	}

}
AC.declare(AC.FormPhoto2, AC.SmallScreen);

/** ******************************************************** */
AC.NouveauProduit2 = function(grpCell, ap){
	this.init(grpCell, ap);
}
AC.NouveauProduit2._static = {

	html : "<div class='acLabel'>Type de produit</div>"
		+ "<div class='acEntry'>"
		+ "<div class='acdd-label italic'></div>"
		+ "<div data-ac-id='type'></div></div>"
		
		+ "<div class=ac'Space0505' data-ac-id='parDemi'></div>"
		
		+ "<div class='acLabel'>Rayon</div>"
		+ "<div class='acEntry'>"
		+ "<div class='acdd-label italic'></div>"
		+ "<div data-ac-id='rayon'></div></div>"
	
		+ "<div class='acLabel'>Nom du produit, unique pour le producteur</div><div class='acEntry'>"
		+ "<input data-ac-id='nouveauProduitInput'></input></div>"

}
AC.NouveauProduit2._proto = {

	init : function(grpCell, ap) {
		this.className = "NouveauProduit2";
		this.cell = grpCell;
		this.type = -1;
		this.ap = ap;
		this.rayon = -1;
		this.ctlg = AC.Catalogue.getN(this.cell.code);
		this.error = false;
		this.edited = false;
		
		var t = new StringBuffer();
		t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
		t.append(AC.NouveauProduit2.html);
		AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Créer", true, 
			"Nouveau produit");
	
		new AC.CheckBox2(this, "parDemi", "Peut être commandé par DEMI part : demi plateau, demi cagette ... " +
				"(non applicable aux pré-emballés)");
	
		var decor = [
		     {code:-1, label : "Choisir un type de prix ..."},
	         {code:1, label : "Produit à prix fixe"},
	         {code:2, label : "Produit pré-emballé, prix au Kg"},
	         {code:3, label : "Produit en vrac (à peser à la distribution), prix au Kg"}];
		new AC.RadioButton(this, "type", decor, true);
		
		var decor2 = [
	         {code:-1, label : "Choisir un rayon ..."},
	         {code:1, label : "Boucherie, charcuterie"},
	         {code:2, label : "Crémerie, produits laitiers, fromages"},
	         {code:3, label : "Fruits et légumes"},
	         {code:4, label : "Epicerie"},
	         {code:0, label : "Autre"},
	         ];
		new AC.RadioButton(this, "rayon", decor2, true);
		
		this._type.val(this.type);
		var self = this;
		this._type.jqCont.off("dataentry").on("dataentry", function(event){
			self.type = self._type.val();
			self.checkAll();
		});
	
		this._parDemi.jqCont.off("dataentry").on("dataentry", function(event){
			self.parDemi = self._parDemi.val();
		});
	
		this._rayon.val(this.rayon);
		this._rayon.jqCont.off("dataentry").on("dataentry", function(event){
			self.rayon = self._rayon.val();
			self.checkAll();
		});
	
		this._nouveauProduitInput = this._content.find("[data-ac-id='nouveauProduitInput']");
		this._nouveauProduitInput.val("");
	
		this._nouveauProduitInput.off(APP.KEYUP).on(APP.KEYUP, function(event){
			APP.NOPROPAG(event);
			self.checkAll();
		});
	
		this.checkAll();
		Util.btnEnable(this._valider, !this.error && this.edited);
		
		this.show();
	},
	
	enEdition : function(){
		return false;
	},
	
	enErreur : function(){
		return this.error;
	}, 
	
	checkAll : function(){
		this.error = false;
		var val = this._nouveauProduitInput.val();
		this.edited = val.length > 0 && this.type != -1 && this.rayon != -1;
		if (this.type == -1) {
			this.setDiag("Le type de prix du produit n'a pas été choisi");
			this.error = true;
		} else if (this.rayon == -1) {
			this.setDiag("Le rayon du produit n'a pas été choisi");
			this.error = true;
		} else if (!val || val.length < 4) {
			this.setDiag("Un nom doit avoir plus de 3 caractères");
			this.error = true;
		} else {
			var p = this.ctlg.hasNom(this.ap, 0, val);
			if (p) {
				this.setDiag("Le nom a déjà été utilisé pour le produit " + p);
				this.error = true;
			}
		}
		if (!this.error)
			this.setDiag("", true);
		Util.btnEnable(this._valider, !this.error && this.edited);
	},
	
	enregistrer : function() {
		var nom = this._nouveauProduitInput.val();
		var arg = {op:"11"};
		arg.gap = this.cell.code;
		arg.apr = this.ap;
		arg.pr = this.ctlg.newPrCode(arg.apr, this.type, this.rayon);
		if (arg.pr < 0) {
			this.setDiag("Plus de 99 produits de ce type pour ce rayon : création impossible");
			return;
		}
		arg.nom = nom;
		if (this.type != 2 && this.parDemi)
			arg.parDemi = 1; 
		arg.operation = "Création d'un nouveau produit de nom " + arg.nom;
		AC.Req.post(this, "alterconsos", arg, function(data) {
			var pr = this.ctlg.produitDeNom(arg.apr, arg.nom)
			AC.Message.info("Création faite. Code : " + pr);
			AC.StackG.show({type:"Pr", ap:arg.apr, pr:pr, gap:arg.gap});
			this.close();
		}, "Echec de la création d'un nouveau produit : ");
	}
}
AC.declare(AC.NouveauProduit2, AC.SmallScreen);

/**************************************************************/
AC.NVLivraison = function(aammjj){
	this.init(aammjj);
}
AC.NVLivraison._static = {
	html1: "<div class='bold italic'>Pour créer une nouvelle livraison pour le ",
	html2 : " appuyer sur le bouton \"Créer\".</div>",
	html3: "<div class='bold italic'>Sinon fermer cette boîte (croix en haut à gauche)</div>",
	html4 : "<div class='ac-sep1rem'>"
		+ "<table><tr style='vertical-align:top;'>"
		+ "<td style='margin:1rem; text-align:center'><div class='orange moyen bold italic'>Recopier les groupes livrés "
		+ "de cette livraison (sinon liste vierge à initialiser) :</div>"
		+ "<div style='margin:1rem auto;width:95%;text-align:left;'><div class='bold italic' data-ac-id='livrs'></div></div></td>"
		+ "<td style='margin:1rem; text-align:center'><div class='vert moyen bold italic'>Recopier le catalogue des prix / disponibiltés "
		+ "de cette livraison (sinon aucun produit) :</div>"
		+ "<div style='margin:1rem auto;width:95%;text-align:left;'><div class='bold italic' data-ac-id='livrsCat'></div></div></td>"
		+ "</tr></table>"

}
AC.NVLivraison._proto = {
	init : function(aammjj){
		this.className = "NVLivraison";
		this.srcLivr = 0;
		this.srcLivrCat = 0;
		this.newdate = aammjj;
		
		var t = new StringBuffer();
		t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
		t.append(this.constructor.html1);
		t.append(AC.AMJ.dateLongue(aammjj));
		t.append(this.constructor.html2);
		t.append(this.constructor.html3);
		t.append(this.constructor.html4);
		AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Créer", true, 
			"Nouvelle livraison");

		var self = this;

		var decor1 = APP.Ctx.cal.decorLivrsGAP(APP.Ctx.loginGrp.code, "(Aucune)", false, true);
		new AC.RadioButton(this, "livrs", decor1, true);
		this._livrs.val(decor1[0].code);
		self.srcLivr = self._livrs.val();
		this._livrs.jqCont.off("dataentry").on("dataentry", function(){
			self.srcLivr = self._livrs.val();
		})

		var decor2 = APP.Ctx.cal.decorLivrsGAP(APP.Ctx.loginGrp.code, "(Aucune)");
		new AC.RadioButton(this, "livrsCat", decor2, true);
		this._livrsCat.val(decor2[0].code);
		self.srcLivrCat = self._livrsCat.val();
		this._livrsCat.jqCont.off("dataentry").on("dataentry", function(){
			self.srcLivrCat = self._livrsCat.val();
		})

		this.show();
	},
	
	enEdition : function(){
		return false;
	},

	enErreur : function() {
		return false;
	},
	
	openCreated : function(){
		var livr = APP.Ctx.cal.getLivrJourGAP(this.newdate, APP.Ctx.loginGrp.code);
		this.close(function(){
			if (livr)
				new AC.Livraison2(APP.Ctx.loginGrp.code, livr.codeLivr);
		});
	},
	
	enregistrer : function(){
		var arg = {op:"30"};
		arg.gap = APP.Ctx.loginGrp.code;
		arg.dateLivr = this.newdate;
		if (this.srcLivr)
			arg.srcCodeLivr = this.srcLivr == 999 ? 0 : this.srcLivr;
		if (this.srcLivrCat)
			arg.srcCodeLivrCat = this.srcLivrCat == 999 ? 0 : this.srcLivrCat;
		arg.operation = "Création d'une nouvelle livraison";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Nouvelle livraison créée");
			this.openCreated();
		}, "Echec de la création : ");
	}

}
AC.declare(AC.NVLivraison, AC.SmallScreen);

/** ******************************************************** */
AC.FormTweets2 = function(cellTweets, gac) {
	this.init(cellTweets, gac);
}
AC.FormTweets2._static= {
	html : "<div data-ac-id='destprod'></div>"
	+ "<div class='acSpace1' data-ac-id='destac'></div>"
	+ "<div class='acSpace1' data-ac-id='urgence'></div>"
	+ "<div class='ac-tweet-sep'>" + "Texte : <span data-ac-id='msglbl'></span></div>"
	+ "<textarea data-ac-id='msgtxt' class='ac-tweet-ta'></textarea>"

}
AC.FormTweets2._proto = {

	init : function(cellTweets, gac) {
		this.name = "FormTweets2";
		this.cell = cellTweets;
		this.gap = this.cell.gap;
		this.codeLivr = this.cell.livr;
		this.gac = gac;
		
		var t = new StringBuffer();
		t.append("<div class='acDivScroll'><div data-ac-id='diag' class='acBarDiag'></div><div class='acSpace2'></div>");
		t.append(this.constructor.html);
		AC.SmallScreen.prototype.init.call(this, 600, t.append("</div>").toString(), "Valider", true, 
			"Message attaché à la livraison");
			
		this.form();
		this.show();
	},
			
	form : function() {
		var _destac = this._content.find("[data-ac-id='destac']");
		var _destprod = this._content.find("[data-ac-id='destprod']");
		var _info = this._content.find("[data-ac-id='info']");
		
		new AC.CheckBox2(this, "destprod", "Envoi DE PLUS aux producteurs / animateurs du groupement");
		new AC.CheckBox2(this, "destac", "Envoi DE PLUS aux alterconsos");
		new AC.CheckBox2(this, "urgence", "Marquer comme important (en rouge)");
		
		if (APP.Ctx.authType == 1 && APP.Ctx.authPower > 2) {
			_info.html("Ce message est au moins à destination, <br>a) de l'alterconso expéditeur (vous-même), " +
				"<br>b) des <b>animateurs</b> de votre groupe." +
				"<br>Il est possible de le destiner DE PLUS aux autres alterconsos du groupe.");
			_destprod.css('display', 'none');
			this.fprod = false;
			this.fac = true;
		}
		if (APP.Ctx.authType == 1 && APP.Ctx.authPower <= 2) {
			_info.html("Ce message est au moins à destination " +
					"des <b>animateurs</b> de votre groupe (dont vous même)." +
					"<br>Il est possible de le destiner DE PLUS aux alterconsos de votre groupe." +
					"<br>Il est possible de le destiner DE PLUS aux producteurs et animateurs du groupement.");
			this.fprod = true;
			this.fac = true;
		}
		if (APP.Ctx.authType == 2 && APP.Ctx.authPower <= 2){
			_info.html("Ce message est au moins à destination, " +
				"<br>a) des producteurs / animateurs du groupement (dont vous-même)," +
				"<br>b) des <b>animateurs</b> du ou des groupes d'alterconsos livrés." +
				"<br>Il est possible de le destiner DE PLUS aux alterconsos de ces groupes.");
			_destprod.css('display', 'none');
			this.fprod = false;
			this.fac = true;
		}
		if (APP.Ctx.authType == 2 && APP.Ctx.authPower > 2){
			_info.html("Ce message est au moins à destination, " +
				"<br>a) des producteurs / animateurs du groupement (dont vous-même)," +
				"<br>b) des <b>animateurs</b> du ou des groupes d'alterconsos livrés.");
			_destprod.css('display', 'none');
			_destac.css('display', 'none');
			this.fprod = false;
			this.fac = false;
		}
				
		var mc = new AC.MC("NouveauTweet", this);
		mc.addVar("destprod", "m", null, Util.BoolEqual).addVar("destac", "m", null, Util.BoolEqual)
		.addVar("urgence", "m", null, Util.BoolEqual).addVar("msgtxt", "m");
		mc.addExpr("msglbl", {t : "msgtxt", v:"_diag"}, function(scr) {
			eval(scr);
			var l = t ? t.length : 0;
			var m = '' + l + 'c';
			Util.text(v, l > 240 ? m + ' - Le texte sera tronqué à 240c' : m);
		});
		mc.addHtml("valider", this.enregistrer);
		mc.addExpr("enEnvoi", {t : "msgtxt", v:"_valider"}, 
			"var l = t ? t.length : 0; Util.btnEnable(v, l != 0)");
		mc.addInput("msgtxt", "msgtxt");
		mc.addRich("destprod", "destprod");
		mc.addRich("destac", "destac");
		mc.addRich("urgence", "urgence");
		this.MC.begin().sync("m", {msgtxt : "", grpseult : 0, destac : 0, destprod : 0, urgence:0}).commit();
	},
	
	enregistrer : function() {
		var arg = {op:"31"};
		arg.codeLivr = this.codeLivr;
		if (this.gac) {
			arg.gap = this.gap;
			if (APP.Ctx.authPower > 2)
				arg.ac = APP.Ctx.authAc;
		}
		arg.urgence = this.MC.val("urgence") ? 1 : 0;
		if (this.fprod && this.MC.val("destprod"))
			arg.ciblePr = 1;
		if (this.fac && this.MC.val("destac"))
			arg.cibleAc = 1;
		arg.texte = this.MC.val("msgtxt");
		arg.operation = "Envoi d'un message";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Envoi du message fait");
			this.close();
		}, "Echec de l'envoi du message : ");
	}

}
AC.declare(AC.FormTweets2, AC.SmallScreen);

/** ******************************************************** */
AC.About = function(){ this.init(); }
AC.About._static = {
	html2 : "<div class='acSpace1'></div>"
		
		+ "<div><img class='ac2x2B' src='images/policeL.png'></img>"
		+ "<div data-ac-id='zoomL' class='btn4'>Police Plus Grande</div></div>"

		+ "<div><img class='ac2x2B' src='images/policeN.png'></img>"
		+ "<div data-ac-id='zoomN' class='btn4'>Police Standard</div></div>"

		+ "<div><img class='ac2x2B' src='images/policeS.png'></img>"
		+ "<div data-ac-id='zoomS' class='btn4'>Police Plus Petite</div></div>"

		+ "<div><img class='ac2x2B' src='images/debug.png'></img>"
		+ "<div data-ac-id='debug1' class='btn4'><span data-ac-id='debugtext'>Démarrer le mode Debug</span></div></div>"

		+ "<div><img class='ac2x2B' src='images/dalto.png'></img>"
		+ "<div data-ac-id='dalto' class='btn4'><span data-ac-id='daltotext'>Mode daltonien</span></div></div>"
}
AC.About._proto = {
	init : function(){
		this.className = "About";
		var t = new StringBuffer();
		t.append("<div class='acDivScroll'>");
		t.append(AC.Req.buildAbout());
		t.append(AC.About.html2);
		
		t.append("<div class='acSpace0505'>");
		t.append("<div class='bold italic'>" + (AC.Req.lastStatus ? "OK" : "ERREUR") + "</div>");
		if (!AC.Req.lastError)
			t.append("<div class='italic'>Aucune erreur depuis le début de la session</div>");
		else 
			t.append(AC.Req.editLastError());
		t.append("</div></div>");

		AC.SmallScreen.prototype.init.call(this, 600, t.toString(), null, true, 
			"A propos de l'application, préférences");

		this._daltotext = APP.id(this, "daltotext");
		this._daltotext.html(APP.Ctx.daltonien ? "Mode daltonien" : "Mode couleurs pastelles");
		this._debugtext = APP.id(this, "debugtext");
		this._debugtext.html(AC.dbg ? "Arrêter le debug" : "Activer le debug");
		
		AC.SmallScreen._screen.css("z-index", 600);
		APP.oncl(this, this._content.find(".btn4"), function(target){
			this["action_"+target.attr("data-ac-id")](target);
		});	
		this.show();
	},
	
	close : function(){
		AC.SmallScreen._screen.css("z-index", 210);
		AC.SmallScreen.prototype.close.call(this);
	},
	
	action_zoomL : function(){
		var n1 = $("html").css("font-size");
		var n2 = parseInt(n1.substring(0, n1.length - 2), 10) + 2;
		if (AC.dbg)
			AC.info("HTML font size passe de " + n1 + " à " + n2 + "px");
		$("html").css("font-size", "" + n2 + "px");
		AC.local("fontsize", n2);
	},
	
	action_zoomS : function(){
		var n1 = $("html").css("font-size");
		var n2 = parseInt(n1.substring(0, n1.length - 2), 10) - 2;
		if (AC.dbg)
			AC.info("HTML font size passe de " + n1 + " à " + n2 + "px");
		$("html").css("font-size", "" + n2 + "px");
		AC.local("fontsize", n2);
	},

	action_zoomN : function(){
		var n1 = $("html").css("font-size");
		var n2 = APP.normalFontSize;
		if (AC.dbg)
			AC.info("HTML font size passe de " + n1 + " à " + n2 + "px (normal)");
		$("html").css("font-size", "" + n2 + "px");
		AC.local("fontsize", "");
	},

	action_debug1 : function(target){
		if (AC.dbg){
			AC.dbg = false;
		} else {
			AC.dbg = true;
			AC.Cell.listAll();
		}
		this._debugtext.html(AC.dbg ? "Arrêter le debug" : "Activer le debug");
	},
	
	action_dalto : function(target){
		APP.Ctx.daltonien = APP.Ctx.daltonien ? "" : "Y";
		AC.local("daltonien", APP.Ctx.daltonien);
		this._daltotext.html(APP.Ctx.daltonien ? "Mode daltonien" : "Mode couleurs pastelles");
	}

}
AC.declare(AC.About, AC.SmallScreen);

/**************************************************************/
