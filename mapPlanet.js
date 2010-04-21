YAHOO.namespace("lacuna");

if (typeof YAHOO.lacuna.MapPlanet == "undefined" || !YAHOO.lacuna.MapPlanet) {
	
(function(){
	var Lang = YAHOO.lang,
		Util = YAHOO.util,
		Dom = Util.Dom,
		Event = Util.Event,
		Sel = Util.Selector,
		Lacuna = YAHOO.lacuna,
		Game = Lacuna.Game,
		Lib = Lacuna.Library;
		
	var MapPlanet = function() {
		this.createEvent("onMapRpc");
		this.createEvent("onMapRpcFailed");
		
		this._buildDetailsPanel();
		this._buildBuilderPanel();
	};
	MapPlanet.prototype = {
		_buildDetailsPanel : function() {
			var panelId = "buildingDetails";
			
			var panel = document.createElement("div");
			panel.id = panelId;
			panel.innerHTML = ['<div class="hd">Details</div>',
				'<div class="bd">',
				'	<div class="yui-gf" style="padding-bottom:5px;">',
				'		<div class="yui-u first">',
				'			<img id="buildingDetailsImg" src="" alt="" style="width:100px;height:100px;" />',
				'		</div>',
				'		<div class="yui-u">',
				'			<ul>',
				'				<li id="buildingDetailsName"></li>',
				'				<li id="buildingDetailsTimeLeft"></li>',
				'				<li id="buildingDetailsDesc"></li>',
				'			</ul>',
				'		</div>',
				'	</div>',
				'	<div id="buildingDetailTabs" class="yui-navset">',
				'		<ul class="yui-nav">',
				'			<li><a href="#detailsProduction"><em>Production</em></a></li>',
				'		</ul>',
				'		<div class="yui-content">',
				'			<div id="detailsProduction">',
				'				<div id="buildingDetailsProduction" class="yui-gb">',
				'					<div class="yui-u first">',
				'						<ul>',
				'							<li>Current Production</li>',
				'							<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span id="buildingDetailsFood" class="buildingDetailsNum"></span></li>',
				'							<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span id="buildingDetailsOre" class="buildingDetailsNum"></span></li>',
				'							<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span id="buildingDetailsWater" class="buildingDetailsNum"></span></li>',
				'							<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span id="buildingDetailsEnergy" class="buildingDetailsNum"></span></li>',
				'							<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span id="buildingDetailsWaste" class="buildingDetailsNum"></span></li>',
				'							<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/happiness.png" /></span><span id="buildingDetailsHappiness" class="buildingDetailsNum"></span></li>',
				'						</ul>',
				'					</div>',
				'					<div class="yui-u">',
				'						<ul id="buildingDetailsUpgradeProduction">',
				'						</ul>',
				'					</div>',
				'					<div class="yui-u">',
				'						<ul id="buildingDetailsUpgradeCost">',
				'						</ul>',
				'					</div>',
				'				</div>',
				'			</div>',
				'		</div>',
				'	</div>',
				'</div>'].join('');
			document.body.insertBefore(panel, document.body.firstChild);
			Dom.addClass(panel, "nofooter");
			
			this.buildingDetails = new YAHOO.widget.Panel(panelId, {
				constraintoviewport:true,
				visible:false,
				draggable:true,
				fixedcenter:false,
				close:true,
				width:"700px",
				underlay:false,
				zIndex:9995,
				context:["header","tl","bl"]
			});
			
			this.buildingDetails.addQueue = function(seconds, queueFn, elm, sc) {
				this.queue = this.queue || [];
				if(this.queue.length == 0) {
					Game.onTick.subscribe(this.processQueue, this, true);
				}
				this.queue.push({secondsRemaining:seconds, el:elm, fn:queueFn, scope:sc});
			};
			this.buildingDetails.processQueue = function(e, oArgs) {
				if(this.queue.length > 0) {
					var queue = this.queue,
						diff = oArgs[0]/1000,
						newq = [];

					while(queue.length > 0) {
						var callback = queue.pop();
						callback.secondsRemaining -= diff;
						if(callback.secondsRemaining > 0) {
							newq.push(callback);
						}
						callback.fn.call(callback.scope || this, callback.secondsRemaining, callback.el);
					}
					this.queue = newq;
				}
				else {
					Game.onTick.unsubscribe(this.processQueue);
				}
			};
			this.buildingDetails.isVisible = function() {
				return this.cfg.getProperty("visible");
			};
			
			this.buildingDetails.renderEvent.subscribe(function(){
				this.img = Dom.get("buildingDetailsImg");
				this.name = Dom.get("buildingDetailsName");
				this.desc = Dom.get("buildingDetailsDesc");
				this.timeLeftLi = Dom.get("buildingDetailsTimeLeft");
				
				this.tabView = new YAHOO.widget.TabView("buildingDetailTabs");
				this.tabView.set('activeIndex',0);
				
				this.upgradeUl = Dom.get("buildingDetailsUpgradeCost");
				this.upgradeProdUl = Dom.get("buildingDetailsUpgradeProduction");
				this.curEnergy = Dom.get("buildingDetailsEnergy");
				this.curFood = Dom.get("buildingDetailsFood");
				this.curHappiness = Dom.get("buildingDetailsHappiness");
				this.curOre = Dom.get("buildingDetailsOre");
				this.curWaste = Dom.get("buildingDetailsWaste");
				this.curWater = Dom.get("buildingDetailsWater");
			
				this.queue = [];
				this.dataStore = {};
			});
			this.buildingDetails.hideEvent.subscribe(function(){
				Game.onTick.unsubscribe(this.buildingDetails.processQueue);
				this.buildingDetails.interval = undefined;
				this.buildingDetails.queue = [];
				this.buildingDetails.dataStore = {};
				this.currentBuilding = undefined;
			}, this, true);
			
			this.buildingDetails.render();
			Game.OverlayManager.register(this.buildingDetails);
		},
		_buildBuilderPanel : function() {
			var panelId = "buildingBuilder";
			
			var panel = document.createElement("div");
			panel.id = panelId;
			panel.innerHTML = ['<div class="hd">Builder</div>',
				'<div class="bd">',
				'	<div id="builderTabs" class="yui-navset">',
				'		<ul class="yui-nav">',
				'			<li><a href="#builderBuildable"><em>Buildable</em></a></li>',
				'			<li><a href="#builderUnavailable"><em>Unavailable</em></a></li>',
				'		</ul>',
				'		<div class="yui-content" style="padding:0 0 0 0.5em;">',
				'			<div id="builderBuildable" style="overflow:auto;height:450px;"><ul id="buildingBuilderList"></ul></div>',
				'			<div id="builderUnavailable" style="overflow:auto;height:450px;"><ul id="buildingBuilderUnavailable"></ul></div>',
				'		</div>',
				'	</div>',
				'</div>'].join('');
			document.body.insertBefore(panel, document.body.firstChild);
			Dom.addClass(panel, "nofooter");
			
			this.buildingBuilder = new YAHOO.widget.Panel(panelId, {
				constraintoviewport:true,
				visible:false,
				draggable:true,
				fixedcenter:false,
				close:true,
				underlay:false,
				width:"600px",
				zIndex:9996,
				context:["header","tr","br"]
			});
			this.buildingBuilder.renderEvent.subscribe(function(){
				this.tabView = new YAHOO.widget.TabView('builderTabs');
				this.list = Dom.get("buildingBuilderList");
				this.unavailable = Dom.get("buildingBuilderUnavailable");
			});
			this.buildingBuilder.showEvent.subscribe(function() {
				this.tabView.set('activeIndex', 0);
			});
			this.buildingBuilder.isVisible = function() {
				return this.cfg.getProperty("visible");
			};
			
			this.buildingBuilder.render();
			Game.OverlayManager.register(this.buildingBuilder);
		},
		
		IsVisible : function() {
			return this._isVisible;
		},
		MapVisible : function(visible) {
			if(this._isVisible != visible) {
				if(this._elGrid) {
					this._isVisible = visible;
					YAHOO.log(visible, "info", "MapPlanet.MapVisible");
					Dom.setStyle(this._elGrid, "display", visible ? "" : "none");
				}
				if(visible) {
					Dom.setStyle(document.getElementsByTagName("html"), 'background', 'url("'+Lib.AssetUrl+'planet_side/surface-a.jpg") repeat scroll 0 0 black');
				}
				else {
					this.buildingDetails.hide();
					this.buildingBuilder.hide();
				}
			}
		},
		Mapper : function(oArgs) {
			YAHOO.log(oArgs.buildings, "debug", "Mapper");
			this.buildings = oArgs.buildings;
			var surfaceUrl = [Lib.AssetUrl,'planet_side/',oArgs.body.surface_image,'.jpg'].join('');
			if(!this._gridCreated) {
				var planetMap = document.createElement("div");
				planetMap.id = "planetMap";
				this._elGrid = document.getElementById("content").appendChild(planetMap);
				this.SetSize();
				
				var map = new Lacuna.Mapper.PlanetMap("planetMap", surfaceUrl);
				map.setZoomLevel(map.addTileData(oArgs.buildings));
				map.imgUrlLoc = Lib.AssetUrl + 'ui/mapiator/';
				
				//draw what we got
				map.redraw();
				//move to command
				map.setCenterToCommand();
				
				this._map = map;
				this._gridCreated = true;
				
				Event.delegate(this._map.mapDiv, "click", function(e, matchedEl, container) {
					if(!this._map.controller.isDragging()) {
						var tile = this._map.tileLayer.findTileById(matchedEl.parentNode.id);
						if(tile && tile.data) {
							this.DetailsView(tile);
						}
						else {
							this.BuilderView(tile);
						}
					}
				}, "div.planetMapTileActionContainer", this, true); //"button.planetMapTileActionButton"
				Event.delegate(this._map.mapDiv, "mouseenter", function(e, matchedEl, container) {
					var c = Sel.query("div.planetMapTileActionContainer", matchedEl, true);
					Dom.setStyle(c, "visibility", "visible");
				}, "div.tile", this, true); 
				Event.delegate(this._map.mapDiv, "mouseleave", function(e, matchedEl, container) {
					var c = Sel.query("div.planetMapTileActionContainer", matchedEl, true);
					Dom.setStyle(c, "visibility", "hidden");
				}, "div.tile", this, true); 
			}
			else {
				if(!this._elGrid.parentNode) {
					document.getElementById("content").appendChild(this._elGrid);
				}
				this._map.addTileData(oArgs.buildings);
				this._map.refresh();
			}
			
			this.MapVisible(true);
			Dom.setStyle(document.getElementsByTagName("html"), 'background', 'url("'+surfaceUrl+'") repeat scroll 0 0 black');
			Lacuna.Pulser.Hide();
		},
		Load : function(planetId) {
			Lacuna.Pulser.Show();
			this.locationId = planetId;
			this.ReLoad();
		},
		ReLoad : function() {
			if(this.locationId) {
				var BodyServ = Game.Services.Body,
					data = {
						session_id: Game.GetSession(""),
						body_id: this.locationId
					};
				
				BodyServ.get_buildings(data,{
					success : function(o){
						YAHOO.log(o, "info", "MapPlanet.ReLoad");
						this.fireEvent("onMapRpc", o.result);
						this.Mapper(o.result);
					},
					failure : function(o){
						YAHOO.log(o, "error", "MapPlanet.ReLoad.FAILED");
						Lacuna.Pulser.Hide();
						this.fireEvent("onMapRpcFailed", o);
					},
					timeout:Game.Timeout,
					scope:this
				});
			}
		},
		ReLoadTile : function(id) {
			if(this._isVisible && id) {
				var building = this.buildings[id];
				if(building) {
					YAHOO.log(building, "info", "MapPlanet.ReLoadTile");
					
					this.ViewData(id, building.url, {
						url:building.url
					}, building.x, building.y);
				}
			}
		},
		SetSize : function() {
			var size = Game.GetSize();
			Dom.setStyle(this._elGrid, "width", size.w+"px");
			Dom.setStyle(this._elGrid, "height", size.h+"px");
		},
		Resize : function() {
			this.SetSize();
			this._map.resize();
		},
		Reset : function() {
			if(this._map) {
				this._map.reset();
			}
		},
		
		ViewData : function(id, url, callback, x, y) {
			var BuildingServ = Game.Services.Buildings.Generic,
				data = {
					session_id: Game.GetSession(""),
					building_id: id
				};
			
			BuildingServ.view(data,{
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.ViewData.success");
					this.fireEvent("onMapRpc", o.result);
					var newB = o.result.building;
					newB.url = callback.url;
					newB.x = x;
					newB.y = y;
					newB.updated = (newB.level != this.buildings[newB.id].level);
					this.buildings[newB.id] = newB;
					this._map.refreshTile(newB);

					if(callback && callback.success) {
						callback.success.call(this, o.result, callback.url, x, y);
					}
					Lacuna.Pulser.Hide();
				},
				failure : function(o){
					Lacuna.Pulser.Hide();
					YAHOO.log(o, "error", "MapPlanet.ViewData.failure");
					
					if(callback && callback.failure) {
						callback.failure.call(this, o.result, callback.url, x, y);
					}
					else {
						this.fireEvent("onMapRpcFailed", o);
					}
				},
				timeout:Game.Timeout,
				scope:this,
				target:url
			});
		},
		DetailsView : function(tile) {
			YAHOO.log(tile, "info", "DetailsView");

			Lacuna.Pulser.Show();
			var panel = this.buildingDetails;
			Game.OverlayManager.hideAll();
			panel.hide(); //hide panel which removes existing info	
			//clear values
			panel.name.innerHTML = "Loading";
			panel.img.src = [Lib.AssetUrl, "planet_side/ground.png"].join('');
			panel.desc.innerHTML = "";
			panel.curEnergy.innerHTML = "";
			panel.curFood.innerHTML = "";
			panel.curHappiness.innerHTML = "";
			panel.curOre.innerHTML = "";
			panel.curWaste.innerHTML = "";
			panel.curWater.innerHTML = "";
			panel.timeLeftLi.innerHTML = "";
			Event.purgeElement(panel.upgradeUl);
			panel.upgradeUl.innerHTML = "";
			Event.purgeElement(panel.upgradeProdUl);
			panel.upgradeProdUl.innerHTML = "";
			
			while(panel.tabView.get("tabs").length > 1){
				var tab = panel.tabView.getTab(0);
				Event.purgeElement(tab.get("contentEl"));
				panel.tabView.removeTab(tab);
			}
			
			this.buildingDetails.show(); //show before we get data so it looks like we're doing something
			
			this.ViewData(tile.data.id, tile.data.url, {
				success:this.DetailsProcess,
				url:tile.data.url
			}, tile.x, tile.y);
		},
		DetailsProcess : function(oResults, url, x, y) {
			var building = oResults.building,
				panel = this.buildingDetails;
			if(panel.isVisible()) {	
				building.url = url;
				building.x = x;
				building.y = y;
				oResults.building = building;
						
				this.currentBuilding = oResults; //assign new building			

				panel.name.innerHTML = [building.name, ' ', building.level].join('');
				panel.img.src = [Lib.AssetUrl, "planet_side/", building.image, ".png"].join('');
				panel.desc.innerHTML = Lib.Descriptions[building.url];
				panel.curEnergy.innerHTML = building.energy_hour;
				panel.curFood.innerHTML = building.food_hour;
				panel.curHappiness.innerHTML = building.happiness_hour;
				panel.curOre.innerHTML = building.ore_hour;
				panel.curWaste.innerHTML = building.waste_hour;
				panel.curWater.innerHTML = building.water_hour;
				
				if(building.pending_build) {
					panel.timeLeftLi.innerHTML = "<label>Build Time Remaining:</label>" + Lib.formatTime(building.pending_build.seconds_remaining);
					if(building.pending_build.seconds_remaining > 0) {
						panel.addQueue(building.pending_build.seconds_remaining,
							function(remaining){
								var rf = Math.round(remaining);
								if(rf <= 0) {
									this.buildingDetails.timeLeftLi.innerHTML = "";
									YAHOO.log("Complete","info","buildingDetails.showEvent.BuildTimeRemaining");
									this.DetailsView({data:{id:building.id,url:building.url},x:building.x,y:building.y});
								}
								else {
									this.buildingDetails.timeLeftLi.innerHTML = "<label>Build Time Remaining:</label>" + Lib.formatTime(rf);
								}
							},
							null,
							this
						);
					}
				}
				else {
					panel.timeLeftLi.innerHTML = "";
				}
				
				Event.purgeElement(panel.upgradeUl);
				Event.purgeElement(panel.upgradeProdUl);
				if(building.upgrade) {
					var up = building.upgrade;
					
					panel.upgradeUl.innerHTML = [
						'	<li>Upgrade Cost</li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span class="buildingDetailsNum">',up.cost.food,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span class="buildingDetailsNum">',up.cost.ore,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span class="buildingDetailsNum">',up.cost.water,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span class="buildingDetailsNum">',up.cost.energy,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span class="buildingDetailsNum">',up.cost.waste,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/time.png" /></span><span class="buildingDetailsNum">',Lib.formatTime(up.cost.time),'</span></li>'
					].join('');


					panel.upgradeProdUl.innerHTML = ['<li><ul><li>Upgrade Production</li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span class="buildingDetailsNum">',up.production.food_hour,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span class="buildingDetailsNum">',up.production.ore_hour,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span class="buildingDetailsNum">',up.production.water_hour,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span class="buildingDetailsNum">',up.production.energy_hour,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span class="buildingDetailsNum">',up.production.waste_hour,'</span></li>',
						'	<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/happiness.png" /></span><span class="buildingDetailsNum">',up.production.happiness_hour,'</span></li>',
						'	</ul></li>',
						up.can ? '<li><button type="button">Upgrade</button></li>' : '<li style="color:red;">Unable to Upgrade:</li><li style="color:red;">',up.reason[1],'</li>'
						].join('');
					
					if(up.can) {
						Event.on(Sel.query("button", panel.upgradeProdUl, true), "click", function(e){
							this.Upgrade();
						}, this, true);
					}
				}
				else {
					panel.upgradeUl.innerHTML = "";
				}
				
				var output, stored;
				
				if(building.upgrade.production && ((building.food_capacity*1 + building.ore_capacity*1 + building.water_capacity*1 + building.energy_capacity*1 + building.waste_capacity*1) > 0)) {
					var p = building.upgrade.production;
					output = [
						'<div class="yui-g">',
						'	<div class="yui-u first">',
						'		<ul>',
						'			<li>Current Storage</li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span class="buildingDetailsNum">',building.food_capacity,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span class="buildingDetailsNum">',building.ore_capacity,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span class="buildingDetailsNum">',building.water_capacity,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span class="buildingDetailsNum">',building.energy_capacity,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span class="buildingDetailsNum">',building.waste_capacity,'</span></li>',
						'		</ul>',
						'	</div>',
						'	<div class="yui-u">',
						'		<ul id="buildingDetailsUpgradeStorage">',
						'			<li>Upgrade Storage</li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span class="buildingDetailsNum">',p.food_capacity,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span class="buildingDetailsNum">',p.ore_capacity,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span class="buildingDetailsNum">',p.water_capacity,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span class="buildingDetailsNum">',p.energy_capacity,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span class="buildingDetailsNum">',p.waste_capacity,'</span></li>',
						'		</ul>',
						'	</div>',
						'</div>'];
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Storage", content: output.join('')}), 0);
				}
				
				if(oResults.planet) { //if it's the planetary command
					var planet = oResults.planet;
					output = [
						'<div class="yui-g buildingDetailsExtra">',
						'	<div class="yui-u first">',
						'		<ul>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/food.png" /></span>',
						'				<span class="pcStored">',planet.food_stored, '</span><span class="pcSlash">/</span><span class="pcCapacity">', planet.food_capacity, '</span> @ <span class="pcPerHour">', planet.food_hour,'</span>/hr</li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span>',
						'				<span class="pcStored">',planet.ore_stored, '</span><span class="pcSlash">/</span><span class="pcCapacity">', planet.ore_capacity, '</span> @ <span class="pcPerHour">', planet.ore_hour,'</span>/hr</li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/water.png" /></span>',
						'				<span class="pcStored">',planet.water_stored, '</span><span class="pcSlash">/</span><span class="pcCapacity">', planet.water_capacity, '</span> @ <span class="pcPerHour">', planet.water_hour,'</span>/hr</li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span>',
						'				<span class="pcStored">',planet.energy_stored, '</span><span class="pcSlash">/</span><span class="pcCapacity">', planet.energy_capacity, '</span> @ <span class="pcPerHour">', planet.energy_hour,'</span>/hr</li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span>',
						'				<span class="pcStored">',planet.waste_stored, '</span><span class="pcSlash">/</span><span class="pcCapacity">', planet.waste_capacity, '</span> @ <span class="pcPerHour">', planet.waste_hour,'</span>/hr</li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/happiness.png" /></span>',
						'				<span class="pcStored">',planet.happiness, '</span><span class="pcSlash">&nbsp;</span><span class="pcCapacity">&nbsp;</span> @ <span class="pcPerHour">', planet.happiness_hour,'</span>/hr</li>',
						'		</ul>',
						'	</div>',
						'	<div class="yui-u first">',
						'		<ul class="buildingDetailsPC">',
						'			<li><label>Buildings:</label>',planet.building_count,'</li>',
						'			<li><label>Planet Size:</label>',planet.size,'</li>',
						'			<li><label>Plots Available:</label>',(planet.size*1) - (planet.building_count*1),'</li>',
						'			<li><label>Location in Universe:</label>',planet.x,'x : ',planet.y,'y : ',planet.z,'z</li>',
						'			<li><label>Star:</label>',planet.star_name,'</li>',
						'			<li><label>Orbit:</label>',planet.orbit,'</li>',
						'		</ul>',
						'	</div>',
						'</div>'
					];
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Planet", content: output.join('')}), 0);
				}
				else if(oResults.build_queue && oResults.build_queue.length > 0) { //if it's the development ministry
					var bq = oResults.build_queue,
						ul = document.createElement("ul"),
						li = document.createElement("li"),
						div = document.createElement("div"),
						subDiv = div.cloneNode(false),
						hUl = ul.cloneNode(false);
						
					Dom.addClass(div, "buildingDetailsExtra");
					
					subDiv.appendChild(document.createTextNode('You can subsidize the build queue for '+oResults.subsidy_cost+' Essentia to finish immediately.'));
					var btn = document.createElement("button");
					btn.type = "button";
					btn.innerHTML = "Subsidize";
					btn = subDiv.appendChild(btn);
					Event.on(btn, "click", this.DevSubsidize, this, true);
					div.appendChild(subDiv);

					Dom.addClass(hUl, "buildQueue buildQueueHeader clearafter");
					hUl.innerHTML = '<li class="buildQueueName">Building</li><li class="buildQueueLevel">Level</li><li class="buildQueueTime">Time</li><li class="buildQueueCoords">Coordinates</li>';
					div.appendChild(hUl);
					
					for(var i=0; i<bq.length; i++) {
						var bqo = bq[i],
							nUl = ul.cloneNode(false),
							nLi = li.cloneNode(false);
						Dom.addClass(nUl, "buildQueue");
						Dom.addClass(nUl, "clearafter");

						Dom.addClass(nLi,"buildQueueName");
						nLi.innerHTML = bqo.name;
						nUl.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"buildQueueLevel");
						nLi.innerHTML = bqo.to_level;
						nUl.appendChild(nLi);
						
						var tLi = li.cloneNode(false);
						Dom.addClass(tLi,"buildQueueTime");
						tLi.innerHTML = Lib.formatTime(bqo.seconds_remaining);
						nUl.appendChild(tLi);

						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"buildQueueCoords");
						nLi.innerHTML = [bqo.x,',',bqo.y].join('');
						nUl.appendChild(nLi);

						div.appendChild(nUl);
						
						panel.addQueue(bqo.seconds_remaining, this.DevMinistryQueue, tLi);
					}
					
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Build Queue", contentEl: div}), 0);
				}
				else if(oResults.ship_build_queue) { //if it's the shipyard 
					var bq = oResults.ship_build_queue,
						tabIndex = 0;
					
					if(bq.queue && bq.queue.length > 0) {
						var ul = document.createElement("ul"),
							li = document.createElement("li"),
							div = document.createElement("div");
							
						div.innerHTML = '<ul class="shipQueue shipQueueHeader clearafter"><li class="shipQueueType">Type</li><li class="shipQueueEach">Time For Next</li><li class="shipQueueQuantity">Quantity</li></ul>';
							
						for(var i=0; i<bq.queue.length; i++) {
							var bqo = bq.queue[i],
								nUl = ul.cloneNode(false),
								nLi = li.cloneNode(false);
								
							nUl.Build = bqo;
							
							Dom.addClass(nUl, "shipQueue");
							Dom.addClass(nUl, "clearafter");

							Dom.addClass(nLi,"shipQueueType");
							nLi.innerHTML = bqo.type;
							nUl.appendChild(nLi);
							
							nLi = li.cloneNode(false);
							Dom.addClass(nLi,"shipQueueEach");
							nLi.innerHTML = Lib.formatTime(bqo.seconds_each);
							nUl.appendChild(nLi);

							nLi = li.cloneNode(false);
							Dom.addClass(nLi,"shipQueueQuantity");
							nLi.innerHTML = bqo.quantity;
							nUl.appendChild(nLi);

							div.appendChild(nUl);
							
							panel.addQueue(bqo.seconds_each, this.ShipyardQueue, nUl, this);
						}
						
						panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Build Queue", contentEl: div}), tabIndex);
						tabIndex++;
					}
											
					var buildTab = new YAHOO.widget.Tab({ label: "Build Ships", content: [
						'<div>',
						'	<div class="shipHeader">There are <span id="shipDocksAvailable"></span> docks available for new ships.</div>',
						'	<ul class="shipHeader shipInfo clearafter">',
						'		<li class="shipType">Type</li>',
						'		<li class="shipCost">Cost</li>',
						'		<li class="shipAttributes">Attributes</li>',
						'		<li class="shipBuild">Build</li>',
						'	</ul>',
						'	<div id="shipDetails">',
						'	</div>',
						'</div>'
					].join('')});
					panel.tabView.addTab(buildTab, tabIndex);
					//subscribe after adding so active doesn't fire
					buildTab.subscribe("activeChange", function(e) {
						if(e.newValue) {
							if(!panel.dataStore.ships) {
								Lacuna.Pulser.Show();
								Game.Services.Buildings.Shipyard.get_buildable({session_id:Game.GetSession(),building_id:oResults.building.id}, {
									success : function(o){
										YAHOO.log(o, "info", "MapPlanet.Shipyard.get_buildable.success");
										Lacuna.Pulser.Hide();
										this.fireEvent("onMapRpc", o.result);
										var sda = Dom.get("shipDocksAvailable");
										if(sda) {
											sda.innerHTML = o.result.docks_available;
										}
										panel.dataStore.ships = {
											buildable: o.result.buildable,
											docks_available: o.result.docks_available
										}
										this.ShipPopulate();
									},
									failure : function(o){
										YAHOO.log(o, "error", "MapPlanet.Shipyard.get_buildable.failure");
										Lacuna.Pulser.Hide();
										this.fireEvent("onMapRpcFailed", o);
									},
									timeout:Game.Timeout,
									scope:this
								});
							}
							else {
								this.ShipPopulate();
							}
						}
					}, this, true);
				}
				else if(oResults.docked_ships) { //if it's the space port
					var ships = oResults.docked_ships;
					output = [
						'<div class="yui-g">',
						'	<div class="yui-u first">',
						'		<ul class="buildingDetailsDockedShips">',
						'			<li><label>Probe</label><span class="buildingDetailsNum">',ships.probe,'</span></li>',
						'			<li><label>Spy Pod</label><span class="buildingDetailsNum">',ships.spy_pod,'</span></li>',
						'			<li><label>Smuggler Ship</label><span class="buildingDetailsNum">',ships.smuggler_ship,'</span></li>',
						'			<li><label>Mining Platform Ship</label><span class="buildingDetailsNum">',ships.mining_platform_ship,'</span></li>',
						'		</ul>',
						'	</div>',
						'	<div class="yui-u">',
						'		<ul class="buildingDetailsDockedShips">',
						'			<li><label>Terraforming Platform Ship</label><span class="buildingDetailsNum">',ships.terraforming_platform_ship,'</span></li>',
						'			<li><label>Gas Giant Settlement Platform Ship</label><span class="buildingDetailsNum">',ships.gas_giant_settlement_platform_ship,'</span></li>',
						'			<li><label>Space Station</label><span class="buildingDetailsNum">',ships.space_station,'</span></li>',
						'			<li><label>Colony Ship</label><span class="buildingDetailsNum">',ships.colony_ship,'</span></li>',
						'		</ul>',
						'	</div>',
						'</div>'
					];
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Docked Ships", content: output.join('')}), 0);
				}
				else if(oResults.party) { //if it's a park
					if(oResults.party.can_throw) {
						output = '<p>Throw a party!  Get John to put this in.</p>';
					}
					else {
						output = '<p>You need at least 10,000 food to throw a party.</p>';
					}
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Party", content: output}), 0);
				}
				else if(oResults.food_stored) {
					stored = oResults.food_stored;
					output = [
						'<div class="yui-g buildingDetailsExtra">',
						'	<div class="yui-u first">',
						'		<ul>',
						'			<li><label>Algae</label><span class="buildingDetailsNum">',stored.algae,'</span></li>',
						'			<li><label>Apple</label><span class="buildingDetailsNum">',stored.apple,'</span></li>',
						'			<li><label>Beetle</label><span class="buildingDetailsNum">',stored.beetle,'</span></li>',
						'			<li><label>Bread</label><span class="buildingDetailsNum">',stored.bread,'</span></li>',
						'			<li><label>Burger</label><span class="buildingDetailsNum">',stored.burger,'</span></li>',
						'			<li><label>Chip</label><span class="buildingDetailsNum">',stored.chip,'</span></li>',
						'			<li><label>Cider</label><span class="buildingDetailsNum">',stored.cider,'</span></li>',
						'			<li><label>Corn</label><span class="buildingDetailsNum">',stored.corn,'</span></li>',
						'			<li><label>Fungus</label><span class="buildingDetailsNum">',stored.fungus,'</span></li>',
						'			<li><label>Lapis</label><span class="buildingDetailsNum">',stored.lapis,'</span></li>',
						'		</ul>',
						'	</div>',
						'	<div class="yui-u first">',
						'		<ul>',
						'			<li><label>Meal</label><span class="buildingDetailsNum">',stored.meal,'</span></li>',
						'			<li><label>Milk</label><span class="buildingDetailsNum">',stored.milk,'</span></li>',
						'			<li><label>Pancake</label><span class="buildingDetailsNum">',stored.pancake,'</span></li>',
						'			<li><label>Pie</label><span class="buildingDetailsNum">',stored.pie,'</span></li>',
						'			<li><label>Potato</label><span class="buildingDetailsNum">',stored.potato,'</span></li>',
						'			<li><label>Root</label><span class="buildingDetailsNum">',stored.root,'</span></li>',
						'			<li><label>Shake</label><span class="buildingDetailsNum">',stored.shake,'</span></li>',
						'			<li><label>Soup</label><span class="buildingDetailsNum">',stored.soup,'</span></li>',
						'			<li><label>Syrup</label><span class="buildingDetailsNum">',stored.syrup,'</span></li>',
						'			<li><label>Wheat</label><span class="buildingDetailsNum">',stored.wheat,'</span></li>',
						'		</ul>',
						'	</div>',
						'</div>'
					];
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Food", content: output.join('')}), 0);
				}
				else if(oResults.ore_stored) {
					stored = oResults.ore_stored;
					output = [
						'<div class="yui-g buildingDetailsExtra">',
						'	<div class="yui-u first">',
						'		<ul>',
						'			<li><label>Anthracite</label><span class="buildingDetailsNum">',stored.anthracite,'</span></li>',
						'			<li><label>Bauxite</label><span class="buildingDetailsNum">',stored.bauxite,'</span></li>',
						'			<li><label>Beryl</label><span class="buildingDetailsNum">',stored.beryl,'</span></li>',
						'			<li><label>Chalcopyrite</label><span class="buildingDetailsNum">',stored.chalcopyrite,'</span></li>',
						'			<li><label>Chromite</label><span class="buildingDetailsNum">',stored.chromite,'</span></li>',
						'			<li><label>Fluorite</label><span class="buildingDetailsNum">',stored.fluorite,'</span></li>',
						'			<li><label>Galena</label><span class="buildingDetailsNum">',stored.galena,'</span></li>',
						'			<li><label>Goethite</label><span class="buildingDetailsNum">',stored.goethite,'</span></li>',
						'			<li><label>Gold</label><span class="buildingDetailsNum">',stored.gold,'</span></li>',
						'			<li><label>Gypsum</label><span class="buildingDetailsNum">',stored.gypsum,'</span></li>',
						'		</ul>',
						'	</div>',
						'	<div class="yui-u first">',
						'		<ul>',
						'			<li><label>Halite</label><span class="buildingDetailsNum">',stored.halite,'</span></li>',
						'			<li><label>Kerogen</label><span class="buildingDetailsNum">',stored.kerogen,'</span></li>',
						'			<li><label>Magnetite</label><span class="buildingDetailsNum">',stored.magnetite,'</span></li>',
						'			<li><label>Methane</label><span class="buildingDetailsNum">',stored.methane,'</span></li>',
						'			<li><label>Monazite</label><span class="buildingDetailsNum">',stored.monazite,'</span></li>',
						'			<li><label>Rutile</label><span class="buildingDetailsNum">',stored.rutile,'</span></li>',
						'			<li><label>Sulfur</label><span class="buildingDetailsNum">',stored.sulfur,'</span></li>',
						'			<li><label>Trona</label><span class="buildingDetailsNum">',stored.trona,'</span></li>',
						'			<li><label>Uraninite</label><span class="buildingDetailsNum">',stored.uraninite,'</span></li>',
						'			<li><label>Zircon</label><span class="buildingDetailsNum">',stored.zircon,'</span></li>',
						'		</ul>',
						'	</div>',
						'</div>'
					];
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Ore", content: output.join('')}), 0);
				}
				else if(oResults.hasOwnProperty("restrict_coverage")) { //network19
					output = [
						'<div id="newsCoverageContainer">',
						'	<span id="newsCoverageText">',oResults.restrict_coverage == "1" ? 'Coverage is current restricted' : 'News is flowing freely', '</span>',
						'	: <button id="newsCoverage" type="button">',(oResults.restrict_coverage == "1" ? 'Open Coverage' : 'Restrict Coverage'),'</button>',
						'</div>',
						'<div class="newsFeedContainer">',
						'	<ul id="newsFeed">',
						'	</ul>',
						'</div>',
						'<div class="newsRssLinksContainer">',
						'	<ul id="newsRssLinks" class="clearafter">',
						'	</ul>',
						'</div>'
					];
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Coverage", content: output.join('')}), 0);
					
					Event.on("newsCoverage", "click", function(e) {
						var target = Event.getTarget(e),
							isRestrict = 1;
						target.disabled = true;
						if(target.innerHTML == "Open Coverage") {
							isRestrict = 0;
						}

						Lacuna.Pulser.Show();
						Game.Services.Buildings.Network19.restrict_coverage({session_id:Game.GetSession(),building_id:oResults.building.id,onoff:isRestrict}, {
							success : function(o){
								YAHOO.log(o, "info", "MapPlanet.Network19.restrict_coverage.success");
								Lacuna.Pulser.Hide();
								this.fireEvent("onMapRpc", o.result);
								
								Dom.get("newsCoverageText").innerHTML = isRestrict ? 'Coverage is currently restricted' : 'News is flowing freely';
								target.innerHTML = isRestrict ? 'Open Coverage' : 'Restrict Coverage';
								target.disabled = false;
							},
							failure : function(o){
								YAHOO.log(o, "error", "MapPlanet.Network19.restrict_coverage.failure");
								Lacuna.Pulser.Hide();
								this.fireEvent("onMapRpcFailed", o);
								target.disabled = false;
							},
							timeout:Game.Timeout,
							scope:this
						});
					}, this, true);
					
					this.GetNews(oResults.building.id);
				}
				else if(oResults.spies) {
					var spies = oResults.spies;
					output = [
						'<div class="yui-g">',
						'	<div class="yui-u first">',
						'		<ul>',
						'			<li><span style="font-weight:bold;">Spies:</span> <span id="spiesCurrent">',spies.current,'</span> of ',spies.maximum,'</li>',
						spies.current < spies.maximum ? '<li><span style="font-weight:bold;">Train:</span> <select id="spiesTrainNumber"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select> new spies. <button type="button" id="spiesTrain">Train</button></li>' : '',
						'		</ul>',
						'	</div>',
						'	<div class="yui-u">',
						'		<ul>',
						'			<li>Training Costs</li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span class="buildingDetailsNum">',spies.training_costs.food,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span class="buildingDetailsNum">',spies.training_costs.ore,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span class="buildingDetailsNum">',spies.training_costs.water,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span class="buildingDetailsNum">',spies.training_costs.energy,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span class="buildingDetailsNum">',spies.training_costs.waste,'</span></li>',
						'			<li><span class="smallImg"><img src="',Lib.AssetUrl,'ui/s/time.png" /></span><span class="buildingDetailsNum">',Lib.formatTime(spies.training_costs.time),'</span></li>',
						'		</ul>',
						'	</div>',
						'</div>'
					];
					var train = new YAHOO.widget.Tab({ label: "Build Spies", content: output.join('')});
					if(spies.current < spies.maximum) {
						var btn = Sel.query("button", train.get("contentEl"), true);
						if(btn) {
							Event.on(btn, "click", this.SpyTrain, this, true);
						}
					}
					panel.tabView.addTab(train, 0);
					
					panel.dataStore.maxSpies = spies.maximum;
					
					var spiesTab = new YAHOO.widget.Tab({ label: "Spies", content: [
						'<div>',
						'	<ul class="spiesHeader spyInfo clearafter">',
						'		<li class="spyAssignedTo">Assigned To</li>',
						'		<li class="spyAvailableWhen">Available When</li>',
						'		<li class="spyAssignment">Assignment</li>',
						'		<li class="spyBurn">Burn</li>',
						'	</ul>',
						'	<div id="spiesDetails">',
						'	</div>',
						'</div>'
					].join('')});
					spiesTab.subscribe("activeChange", function(e) {
						if(e.newValue) {
							if(!panel.dataStore.spies) {
								Lacuna.Pulser.Show();
								Game.Services.Buildings.Intelligence.view_spies({session_id:Game.GetSession(),building_id:oResults.building.id}, {
									success : function(o){
										YAHOO.log(o, "info", "MapPlanet.Intelligence.view_spies.success");
										Lacuna.Pulser.Hide();
										this.fireEvent("onMapRpc", o.result);
										panel.dataStore.spies = o.result.spies;
										this.SpyPopulate();
									},
									failure : function(o){
										YAHOO.log(o, "error", "MapPlanet.Intelligence.view_spies.failure");
										Lacuna.Pulser.Hide();
										this.fireEvent("onMapRpcFailed", o);
									},
									timeout:Game.Timeout,
									scope:this
								});
							}
							else {
								this.SpyPopulate();
							}
						}
					}, this, true);
					panel.tabView.addTab(spiesTab, 1);
				}
				else if(oResults.building.url == "/observatory") {
					output = [
						'<div class="probeContainer">',
						'	<ul class="probeInfo probeHeader clearafter">',,
						'		<li class="probePlanet">Planet</li>',
						'		<li class="probeCoords">Coordinates</li>',
						'	</ul>',
						'	<div id="probeDetails">',
						'	</div>',
						'</div>',
					];
					panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Probes", content: output.join('')}), 0);
					
					this.GetProbes(oResults.building.id);
				}
				else if(oResults.recycle) { //waste recycling center
					if(oResults.recycle.can) {
						var planet = Game.GetCurrentPlanet(),
							ul = document.createElement("ul"),
							li = document.createElement("li"),
							nLi = li.cloneNode(false),
							input;
						
						nLi.innerHTML = '<label>Recycle into:</label>';
						ul.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						nLi.innerHTML = '<span class="smallImg"><img src="'+Lib.AssetUrl+'ui/s/ore.png" /></span>';
						input = document.createElement("input");
						input.type = "text";
						input.originalValue = 0;
						input.value = 0;
						input = nLi.appendChild(input);
						Event.on(input, "change", this.RecycleValueChange, panel, true);
						panel.dataStore.recycleOreEl = input;
						ul.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						nLi.innerHTML = '<span class="smallImg"><img src="'+Lib.AssetUrl+'ui/s/water.png" /></span>';
						input = document.createElement("input");
						input.type = "text";
						input.originalValue = 0;
						input.value = 0;
						input = nLi.appendChild(input);
						Event.on(input, "change", this.RecycleValueChange, panel, true);
						panel.dataStore.recycleWaterEl = input;
						ul.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						nLi.innerHTML = '<span class="smallImg"><img src="'+Lib.AssetUrl+'ui/s/energy.png" /></span>';
						input = document.createElement("input");
						input.type = "text";
						input.originalValue = 0;
						input.value = 0;
						input = nLi.appendChild(input);
						Event.on(input, "change", this.RecycleValueChange, panel, true);
						panel.dataStore.recycleEnergyEl = input;
						ul.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						nLi.innerHTML = '<label>Total:</label>';
						var span = nLi.appendChild(document.createElement("span"));
						span.innerHTML = 0;
						ul.appendChild(nLi);
						
						panel.dataStore.totalWasteToRecycle = 0;
						panel.dataStore.totalWasteToRecycleEl = span;
						
						if(Game.EmpireData.essentia != "") {
							nLi = li.cloneNode(false);
							nLi.innerHTML = '<label>Spend 2 Essentia to recycle immediately?</label>';
							var select = document.createElement("select"),
								optA = select.appendChild(document.createElement("option")),
								optB = select.appendChild(document.createElement("option"));
							optA.value = "0";
							optA.innerHTML = "No";
							optB.value = "1";
							optB.innerHTML = "Yes";
							select = nLi.appendChild(select);
							panel.dataStore.recycleUseEssentiaEl = select;
							ul.appendChild(nLi);
						}
						
						nLi = li.cloneNode(false);
						panel.dataStore.recycleMessageEl = nLi;
						ul.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						var btn = document.createElement("button");
						btn.type = "button";
						btn.innerHTML = "Recycle";
						btn = nLi.appendChild(btn);
						Event.on(btn, "click", this.Recycle, this, true);
						ul.appendChild(nLi);
						
						var div = document.createElement("div");
						div.appendChild(ul);
						panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Recycle", contentEl: div}), 0);
					}
					else if(oResults.recycle.seconds_remaining) {
						output = ['<p>Time remaining on current recycling job:<span id="recycleTime">',Lib.formatTime(oResults.recycle.seconds_remaining),'</span></p>'].join('');
						panel.tabView.addTab(new YAHOO.widget.Tab({ label: "Recycle", content: output}), 0);
						panel.addQueue(oResults.recycle.seconds_remaining, this.RecycleQueue, "recycleTime");
					}
				}

				Dom.setStyle("buildingDetailTabs", "display", "");
				panel.tabView.selectTab(0);
			}
		},
		
		BuilderView : function(tile) {
			YAHOO.log(tile, "info", "BuilderView");
			var BodyServ = Game.Services.Body,
				data = {
					session_id: Game.GetSession(""),
					body_id: this.locationId,
					x:tile.x,
					y:tile.y
				};
			
			Event.purgeElement(this.buildingBuilder.list);
			this.buildingBuilder.list.innerHTML = "";
			Event.purgeElement(this.buildingBuilder.unavailable);
			this.buildingBuilder.unavailable.innerHTML = "";
			
			Game.OverlayManager.hideAll();
			Lacuna.Pulser.Show();
			this.buildingBuilder.show();
			
			BodyServ.get_buildable(data,{
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.BuilderView.success");
					this.fireEvent("onMapRpc", o.result);
					
					this.BuilderProcess(o.result, data);
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.BuilderView.failure");
					this.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		BuilderProcess : function(oResults, request) {
			if(this.buildingBuilder.isVisible()) {
				var b = oResults.buildable;
				if(b) {			
					var frag = document.createDocumentFragment(),
						unavailFrag = document.createDocumentFragment(),
						li = document.createElement("li"),
						names = [], //tags={},
						reason, br;
					
					for(var name in b) {
						if(b.hasOwnProperty(name)) {
							names.push(name);
							/*var bd = b[name];
							for(var i=0; i<bd.build.tags.length; i++){
								var tagBuildings = tags[bd.build.tags[i]] || {};
								tagBuildings[name] = bd;
								tags[bd.build.tags[i]] = tagBuildings;
							}*/
						}
					}
					names.sort();
					
					for(var i=0; i<names.length; i++) {
						var bd = b[names[i]],
							nLi = li.cloneNode(false),
							costs = bd.build.cost,
							prod = bd.production;
							
						bd.name = names[i];
						
						if(bd.build.can) {
							nLi.innerHTML = ['<div class="yui-gb" style="margin-bottom:2px;">',
							'	<div class="yui-u first" style="width:20%">',
							'		<img src="',Lib.AssetUrl,'planet_side/',bd.image,'.png" style="width:100px;height:100px;" />',
							'	</div>',
							'	<div class="yui-u" style="width:65%">',
							'		<span class="buildingName">',bd.name,'</span>: ',
							'		<div class="buildingDesc" style="display:none">',Lib.Descriptions[bd.url],'</div>',
							'		<div><label style="font-weight:bold;">Cost:</label>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span>',costs.food,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span>',costs.ore,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span>',costs.water,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span>',costs.energy,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span>',costs.waste,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/time.png" /></span>',Lib.formatTime(costs.time),'</span>',
							'		</div>',
							'		<div><label style="font-weight:bold;">Prod:</label>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span>',prod.food_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span>',prod.ore_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span>',prod.water_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span>',prod.energy_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span>',prod.waste_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/happiness.png" /></span><span>',prod.happiness_hour,'</span></span>',
							'		</div>',
							'	</div>',
							'	<div class="yui-u" style="width:10%">',
							'		<button type="button">Build</button>',
							'	</div>',
							'</div>'].join('');
							Sel.query("button", nLi, true).building = bd;
							
							frag.appendChild(nLi);
						}
						else {
							br = bd.build.reason;
							switch(br[0]) {
								case 1011:
									reason = [br[1], ' Requires more ', (Lang.isArray(br[2]) ? br[2].join(', ') : br[2])].join('');
									break;
								case 1012:
									if(br[2]) {
										reason = [br[1], ' Requires higher production of ', (Lang.isArray(br[2]) ? br[2].join(', ') : br[2])].join('');
									}
									else {
										reason = br[1];
									}
									break;
								case 1013:
									if(br.length == 2) {
										reason = br[1];
									}
									else if(Lang.isArray(br[2])){
										reason = [br[1], ' Requires ', br[2].join(' level ')].join('');
									}
									else {
										reason = [br[1], ' Requires level ', br[2]].join('');
									}
									break;
								default:
									reason = "";
									break;
							}
							nLi.innerHTML = ['<div class="yui-gf" style="margin-bottom:2px;">',
							'	<div class="yui-u first" style="width:20%;">',
							'		<img src="',Lib.AssetUrl,'planet_side/',bd.image,'.png" style="width:100px;height:100px;" />',
							'	</div>',
							'	<div class="yui-u" style="width:78%;">',
							'		<span class="buildingName">',bd.name,'</span>: ',
							'		<span class="buildingReason">',reason,'</span>',
							'		<div class="buildingDesc" style="display:none">',Lib.Descriptions[bd.url],'</div>',
							'		<div><label style="font-weight:bold;">Cost:</label>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span>',costs.food,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span>',costs.ore,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span>',costs.water,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span>',costs.energy,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span>',costs.waste,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/time.png" /></span>',Lib.formatTime(costs.time),'</span>',
							'		</div>',
							'		<div><label style="font-weight:bold;">Prod:</label>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span>',prod.food_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span>',prod.ore_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span>',prod.water_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span>',prod.energy_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span>',prod.waste_hour,'</span></span>',
							'			<span><span><img src="',Lib.AssetUrl,'ui/s/happiness.png" /></span><span>',prod.happiness_hour,'</span></span>',
							'		</div>',
							'	</div>',
							'</div>'].join('');
							
							unavailFrag.appendChild(nLi);
						}
					}

					Event.delegate(this.buildingBuilder.list, "click", function(e, matchedEl, container) {
						this.Build(matchedEl.building, request.x, request.y);
					}, "button", this, true);
					Event.delegate([this.buildingBuilder.list,this.buildingBuilder.unavailable], "click", function(e, matchedEl, container) {
						var desc = Sel.query('div.buildingDesc', matchedEl.parentNode, true);
						if(desc) {
							var dis = Dom.getStyle(desc, "display");
							Dom.setStyle(desc, "display", dis == "none" ? "" : "none");
						}
					}, "span.buildingName");
					
					this.buildingBuilder.list.appendChild(frag);
					this.buildingBuilder.unavailable.appendChild(unavailFrag);
				}
				
				Lacuna.Pulser.Hide();
			}
		},
		
		Build : function(building, x, y) {
			Lacuna.Pulser.Show();
			var BuildingServ = Game.Services.Buildings.Generic,
				data = {
					session_id: Game.GetSession(""),
					planet_id: this.locationId,
					x:x,
					y:y
				};
			
			BuildingServ.build(data,{
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.Build.success");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpc", o.result);
					this.buildingBuilder.hide();

					var b = building; //originally passed in building data from BuildProcess
					b.id = o.result.building.id;
					b.level = o.result.building.level;
					b.pending_build = o.result.building.pending_build;
					b.x = x;
					b.y = y;
					YAHOO.log(b, "info", "MapPlanet.Build.success.building");
					this.UpdateCost(b.build.cost);
					
					this.QueueReload(b);
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.Build.failure");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpcFailed", o);
					this.buildingBuilder.hide();
				},
				timeout:Game.Timeout,
				scope:this,
				target:building.url
			});
		},
		DevMinistryQueue : function(remaining, el){
			if(remaining <= 0) {
				var ul = el.parentNode,
					c = ul.parentNode;
				c.removeChild(ul);
			}
			else {
				el.innerHTML = Lib.formatTime(Math.round(remaining));
			}
		},
		DevSubsidize : function(e) {
			Lacuna.Pulser.Show();
			
			Game.Services.Buildings.Development.subsidize_build_queue({
				session_id:Game.GetSession(),
				building_id:this.currentBuilding.building.id
			}, {
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.DevSubsidize.success");
					Lacuna.Pulser.Hide();
					var e = Game.EmpireData.essentia*1;
					Game.EmpireData.essentia = e - o.result.essentia_spent*1;
					this.fireEvent("onMapRpc", o.result);
					
					var tab = this.buildingDetails.tabView.getTab(0);
					Event.purgeElement(tab.get("contentEl"));
					this.buildingDetails.tabView.removeTab(tab);
					
					//remove all tile timers
					Game.QueueResetPlanet();
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.DevSubsidize.failure");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});		
		},
		Recycle : function(e) {
			var panel = this.buildingDetails,
				dataStore = panel.dataStore,
				planet = Game.GetCurrentPlanet();
			if(planet) {
				var ore = dataStore.recycleOreEl.value*1,
					water = dataStore.recycleWaterEl.value*1,
					energy = dataStore.recycleEnergyEl.value*1,
					total = ore + water + energy;
				if(total > planet.waste_stored) {
					dataStore.recycleMessageEl.innerHTML = "Can only recycle waste you have stored.";
				}
				else {
					Lacuna.Pulser.Show();
					
					Game.Services.Buildings.Recycler.recycle({
						session_id:Game.GetSession(),
						building_id:this.currentBuilding.building.id,
						water:water,
						ore:ore,
						energy:energy,
						use_essentia:0
					}, {
						success : function(o){
							YAHOO.log(o, "info", "MapPlanet.Recycle.success");
							Lacuna.Pulser.Hide();
							this.fireEvent("onMapRpc", o.result);
							
							var output = ['<p>Time remaining on current recycling job:<span id="recycleTime">',Lib.formatTime(o.result.seconds_remaining),'</span></p>'].join('');
							var tab = panel.tabView.getTab(0),
								ce = tab.get("contentEl");
							Event.purgeElement(ce);
							ce.removeChild(ce.firstChild);
							ce.innerHTML = output;
							panel.addQueue(o.result.seconds_remaining, this.RecycleQueue, "recycleTime");
						},
						failure : function(o){
							YAHOO.log(o, "error", "MapPlanet.Recycle.failure");
							Lacuna.Pulser.Hide();
							this.fireEvent("onMapRpcFailed", o);
						},
						timeout:Game.Timeout,
						scope:this
					});
				}
			}
		},
		RecycleQueue : function(remaining, el){
			if(remaining <= 0) {
				var span = Dom.get(el),
					p = span.parentNode;
				p.removeChild(span);
				p.innerHTML = "No recycling jobs running.";
			}
			else {
				Dom.get(el).innerHTML = Lib.formatTime(Math.round(remaining));
			}
		},
		RecycleValueChange : function(e){
			var input = Event.getTarget(e),
				val = input.value*1,
				ds = this.dataStore;
			if(Lang.isNumber(val)){
				ds.totalWasteToRecycle = ds.totalWasteToRecycle - input.originalValue + val;
				ds.totalWasteToRecycleEl.innerHTML = ds.totalWasteToRecycle;
				input.originalValue = val;
			}
			else {
				input.value = input.originalValue;
			}
		},
		ShipyardQueue : function(remaining, elLine){
			if(remaining <= 0) {
				elLine.Build.quantity--;
				if(elLine.Build.quantity > 0) {
					Sel.query("li.shipQueueQuantity",elLine,true).innerHTML = elLine.Build.quantity;
					this.buildingDetails.addQueue(elLine.Build.seconds_each, this.ShipyardQueue, elLine, this);
				}
				else {
					elLine.parentNode.removeChild(elLine);
				}
			}
			else {
				Sel.query("li.shipQueueEach",elLine,true).innerHTML = Lib.formatTime(Math.round(remaining));
			}
		},
		GetNews : function(id) {
			Lacuna.Pulser.Show();
			Game.Services.Buildings.Network19.view_news({session_id:Game.GetSession(),building_id:id}, {
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.Network19.success");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpc", o.result);
					
					var news = o.result.news,
						newsFeed = Dom.get("newsFeed"),
						feedFrag = document.createDocumentFragment(),
						rss = o.result.feeds,
						newsRssLinks = Dom.get("newsRssLinks"),
						rssFrag = document.createDocumentFragment(),
						li = document.createElement("li");
						
					for(var i=0; i<news.length; i++) {
						var ni = news[i],
							nLi = li.cloneNode(false);
						Dom.addClass(nLi, "newsHeadline");
						nLi.innerHTML = [Lib.formatServerDateShort(ni.date), ": ", ni.headline].join('');
						feedFrag.appendChild(nLi);
					}
					newsFeed.appendChild(feedFrag);
					
					for(var key in rss) {
						if(rss.hasOwnProperty(key)){
							var link = rss[key],
								rssLi = li.cloneNode(false);
							Dom.addClass(rssLi, "newsRssLink");
							rssLi.innerHTML = [key, '<a href="', link, '" target="_blank"><img src="', Lib.AssetUrl, 'ui/rss.png" alt="rss" style="margin-left:1px" /></a>'].join('');
							rssFrag.appendChild(rssLi);
						}
					}
					newsRssLinks.appendChild(rssFrag);
							
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.Network19.failure");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		GetProbes : function(id) {
			Lacuna.Pulser.Show();
			Game.Services.Buildings.Observatory.get_probed_stars({session_id:Game.GetSession(),building_id:id,page_number:1}, {
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.GetProbes.success");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpc", o.result);
					
					var stars = o.result.stars,
						probeDetails = Dom.get("probeDetails"),
						ul = document.createElement("ul"),
						li = document.createElement("li");
						
					for(var i=0; i<stars.length; i++) {
						var st = stars[i],
							nUl = ul.cloneNode(false),
							nLi = li.cloneNode(false);
							
						nUl.Star = st;
						Dom.addClass(nUl, "probeInfo");
						Dom.addClass(nUl, "clearafter");

						Dom.addClass(nLi,"probePlanet");
						nLi.innerHTML = st.name;
						nUl.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"probeCoords");
						nLi.innerHTML = [st.x, st.y, st.z].join(', ');
						nUl.appendChild(nLi);
						
						probeDetails.appendChild(nUl);
					}
							
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.GetProbes.failure");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		ShipPopulate : function() {
			var details = Dom.get("shipDetails");
			
			if(details) {
				var panel = this.buildingDetails,
					ships = panel.dataStore.ships.buildable,
					ul = document.createElement("ul"),
					li = document.createElement("li");
					
				Event.purgeElement(details);
				details.innerHTML = "";
				
				var convert = {
					gas_giant_settlement_platform_ship:"Gas Giant Platform",
					terraforming_platform_ship:"Terraforming Platform",
					cargo_ship:"Cargo Ship",
					probe:"Probe",
					space_station:"Space Station",
					mining_platform_ship:"Mining Platform",
					spy_pod:"Spy Pod",
					smuggler_ship:"Smuggler Ship",
					colony_ship:"Colony Ship"
				};
						
				for(var shipType in ships) {
					if(ships.hasOwnProperty(shipType)) {
						var ship = ships[shipType],
							nUl = ul.cloneNode(false),
							nLi = li.cloneNode(false);
							
						nUl.Ship = ship;
						Dom.addClass(nUl, "shipInfo");
						Dom.addClass(nUl, "clearafter");

						Dom.addClass(nLi,"shipType");
						nLi.innerHTML = convert[shipType];
						nUl.appendChild(nLi);

						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"shipCost");
						nLi.innerHTML = [
							'<span><span><img src="',Lib.AssetUrl,'ui/s/food.png" /></span><span>',ship.cost.food,'</span></span>',
							'<span><span><img src="',Lib.AssetUrl,'ui/s/ore.png" /></span><span>',ship.cost.ore,'</span></span>',
							'<span><span><img src="',Lib.AssetUrl,'ui/s/water.png" /></span><span>',ship.cost.water,'</span></span>',
							'<span><span><img src="',Lib.AssetUrl,'ui/s/energy.png" /></span><span>',ship.cost.energy,'</span></span>',
							'<span><span><img src="',Lib.AssetUrl,'ui/s/waste.png" /></span><span>',ship.cost.waste,'</span></span>',
							'<span><span><img src="',Lib.AssetUrl,'ui/s/time.png" /></span>',Lib.formatTime(ship.cost.seconds),'</span>'
						].join('');
						nUl.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"shipAttributes");
						nLi.innerHTML = "Speed: " + ship.attributes.speed;
						nUl.appendChild(nLi);

						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"shipBuild");
						if(ship.can) {
							var bbtn = document.createElement("button");
							bbtn.type = "button";
							bbtn.innerHTML = "Build";
							bbtn = nLi.appendChild(bbtn);
							Event.on(bbtn, "click", this.ShipBuild, {Self:this,Type:shipType,Ship:ship}, true);
						}
						nUl.appendChild(nLi);

						details.appendChild(nUl);
						
					}
				}
			}
		},
		ShipBuild : function() {
			Lacuna.Pulser.Show();
			var cb = this.Self.currentBuilding;
			
			Game.Services.Buildings.Shipyard.build_ship({
				session_id:Game.GetSession(),
				building_id:cb.building.id,
				type:this.Type,
				quantity:1
			}, {
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.ShipBuild.success");
					Lacuna.Pulser.Hide();
					this.Self.fireEvent("onMapRpc", o.result);
					this.Self.UpdateCost(this.Ship.cost);
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.ShipBuild.failure");
					Lacuna.Pulser.Hide();
					this.Self.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		SpyPopulate : function() {
			var details = Dom.get("spiesDetails");
			
			if(details) {
				var panel = this.buildingDetails,
					spies = panel.dataStore.spies,
					ul = document.createElement("ul"),
					li = document.createElement("li");
					
				Event.purgeElement(details);
				details.innerHTML = "";
						
				for(var spyId in spies) {
					if(spies.hasOwnProperty(spyId)) {
						var spy = spies[spyId],
							nUl = ul.cloneNode(false),
							nLi = li.cloneNode(false);
							
						nUl.Spy = spy;
						Dom.addClass(nUl, "spyInfo");
						Dom.addClass(nUl, "clearafter");

						Dom.addClass(nLi,"spyAssignedTo");
						nLi.innerHTML = spy.assigned_to.name;
						nUl.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"spyAvailableWhen");
						nLi.innerHTML = spy.is_available ? 'Now' : Lib.formatServerDate(spy.available_on);
						nUl.appendChild(nLi);
						
						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"spyAssignment");
						if(spy.is_available) {
							var sel = document.createElement("select"),
								opt1 = document.createElement("option"),
								opt2 = opt1.cloneNode(false),
								opt3 = opt1.cloneNode(false),
								btn = document.createElement("button");
							opt1.value = opt1.innerHTML = "Idle";
							if(spy.assignment == "Idle") { opt1.selected = true; sel.defaultIndex = 0; }
							sel.appendChild(opt1);
							opt2.value = "Counter Intelligence";
							opt2.innerHTML = "Counter Intel";
							if(spy.assignment == "Counter Intelligence") { opt2.selected = true; sel.defaultIndex = 1; }
							sel.appendChild(opt2);
							opt3.value = opt3.innerHTML = "Sting";
							if(spy.assignment == "Sting") { opt3.selected = true; sel.defaultIndex = 2;}
							sel.defaultValue = spy.assignment;
							sel.appendChild(opt3);
							Event.on(sel, "change", this.SpyAssignChange);
							
							nLi.appendChild(sel);
							
							btn.type = "button";
							btn.innerHTML = "Assign";
							Dom.setStyle(btn,"display","none");
							Event.on(btn, "click", this.SpyAssign, {Self:this,Assign:sel,Id:spyId}, true);
							sel.Button = nLi.appendChild(btn);
						}
						else {
							nLi.innerHTML = spy.assignment;
						}
						nUl.appendChild(nLi);

						nLi = li.cloneNode(false);
						Dom.addClass(nLi,"spyBurn");
						var bbtn = document.createElement("button");
						bbtn.type = "button";
						bbtn.innerHTML = "Burn";
						bbtn = nLi.appendChild(bbtn);
						nUl.appendChild(nLi);

						details.appendChild(nUl);
						
						Event.on(bbtn, "click", this.SpyBurn, {Self:this,Id:spyId,Line:nUl}, true);
					}
				}
			}
		},
		SpyAssignChange : function() {
			var btn = this.Button,
				defVal = this.defaultValue,
				selVal = this[this.selectedIndex].value;
			if(btn) {
				Dom.setStyle(btn, "display", defVal != selVal ? "" : "none");
			}
		},
		SpyAssign : function() {
			Lacuna.Pulser.Show();
			var assign = this.Assign[this.Assign.selectedIndex].value,
				cb = this.Self.currentBuilding;
			
			Game.Services.Buildings.Intelligence.assign_spy({
				session_id:Game.GetSession(),
				building_id:cb.building.id,
				spy_id:this.Id,
				assignment:assign
			}, {
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.SpyAssign.success");
					Lacuna.Pulser.Hide();
					this.Self.fireEvent("onMapRpc", o.result);
					this.Self.buildingDetails.dataStore.spies = undefined;
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.SpyAssign.failure");
					Lacuna.Pulser.Hide();
					this.Self.fireEvent("onMapRpcFailed", o);
					this.Assign.selectedIndex = this.Assign.defaultIndex;
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		SpyBurn : function() {
			Lacuna.Pulser.Show();
			var cb = this.Self.currentBuilding;
			
			Game.Services.Buildings.Intelligence.burn_spy({
				session_id:Game.GetSession(),
				building_id:cb.building.id,
				spy_id:this.Id
			}, {
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.SpyBurn.success");
					Lacuna.Pulser.Hide();
					this.Self.fireEvent("onMapRpc", o.result);
					delete this.Self.buildingDetails.dataStore.spies[this.Id];
					this.Line.parentNode.removeChild(this.Line);
					cb.spies.current = (cb.spies.current*1) - 1;
					Dom.get("spiesCurrent").innerHTML = cb.spies.current;
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.SpyBurn.failure");
					Lacuna.Pulser.Hide();
					this.Self.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		SpyTrain : function() {
			var select = Dom.get("spiesTrainNumber"),
				num = select[select.selectedIndex].value*1,
				cb = this.currentBuilding;
				
			if(Lang.isNumber(num) && num < cb.spies.maximum) {
				Lacuna.Pulser.Show();
				Game.Services.Buildings.Intelligence.train_spy({session_id:Game.GetSession(),building_id:cb.building.id,quantity:num}, {
					success : function(o){
						YAHOO.log(o, "info", "MapPlanet.SpyTrain.success");
						Lacuna.Pulser.Hide();
						this.fireEvent("onMapRpc", o.result);
						this.buildingDetails.dataStore.spies = undefined;
						cb.spies.current = (cb.spies.current*1) + (o.result.trained*1);
						Dom.get("spiesCurrent").innerHTML = cb.spies.current;
						this.UpdateCost(cb.spies.training_costs);
					},
					failure : function(o){
						YAHOO.log(o, "error", "MapPlanet.SpyTrain.failure");
						Lacuna.Pulser.Hide();
						this.fireEvent("onMapRpcFailed", o);
					},
					timeout:Game.Timeout,
					scope:this
				});
			}
		},
		Upgrade : function() {
			Lacuna.Pulser.Show();
			var building = this.currentBuilding.building,
				BuildingServ = Game.Services.Buildings.Generic,
				data = {
					session_id: Game.GetSession(""),
					building_id: building.id
				};
			
			BuildingServ.upgrade(data,{
				success : function(o){
					YAHOO.log(o, "info", "MapPlanet.Upgrade.success");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpc", o.result);
					this.buildingDetails.hide();
					
					var b = building; //originally passed in building data from currentBuilding
					b.id = o.result.building.id;
					b.level = o.result.building.level;
					b.pending_build = o.result.building.pending_build;
					YAHOO.log(b, "info", "MapPlanet.Upgrade.success.building");
					this.UpdateCost(b.upgrade.cost);
					
					this.QueueReload(b);
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapPlanet.Upgrade.failure");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this,
				target:building.url
			});
		},
		UpdateCost : function(cost) {
			var planet = Game.EmpireData.planets[this.locationId];
			if(planet && cost) {
				planet.energy_stored -= cost.energy*1;
				if(planet.energy_stored > planet.energy_capacity) {
					planet.energy_stored = planet.energy_capacity;
				}
				planet.food_stored -= cost.food*1;
				if(planet.food_stored > planet.food_capacity) {
					planet.food_stored = planet.food_capacity;
				}
				planet.ore_stored -= cost.ore*1;
				if(planet.ore_stored > planet.ore_capacity) {
					planet.ore_stored = planet.ore_capacity;
				}
				planet.water_stored -= cost.water*1;
				if(planet.water_stored > planet.water_capacity) {
					planet.water_stored = planet.water_capacity;
				}
				
				/*planet.waste_stored += cost.waste*1;
				if(planet.waste_stored > planet.waste_capacity) {
					planet.waste_stored = planet.waste_capacity;
				}*/
				
				var wasteOverage = 0;
				if(planet.waste_stored < planet.waste_capacity){
					planet.waste_stored += cost.waste*1;
					if(planet.waste_stored > planet.waste_capacity) {
						wasteOverage = planet.waste_stored - planet.waste_capacity;
						planet.waste_stored = planet.waste_capacity;
					}
				}
				else {
					wasteOverage = cost.waste*1;
				}
				
				planet.happiness -= wasteOverage;
				if(planet.happiness < 0) {
					planet.happiness = 0;
				}
				Game.EmpireData.happiness -= wasteOverage;
				if(Game.EmpireData.happiness < 0) {
					Game.EmpireData.happiness = 0;
				}
			
				Lacuna.Menu.updateTick();
			}
		},
		QueueReload : function(building) {
			if(building.pending_build) {
				this.buildings[building.id] = building;
				this._map.addSingleTileData(building);
				this._map.refresh();
				
				var ms = (building.pending_build.seconds_remaining * 1000);
				Game.QueueAdd(building.id, Lib.QueueTypes.PLANET, ms);
			}
		},
		QueueTick : function(id, ms) {
			if(this.buildings) {
				var building = this.buildings[id];
				if(building) {
					if(building.pending_build) {
						building.pending_build.seconds_remaining = (ms / 1000);
					}
					else {
						building.pending_build = {seconds_remaining : (ms / 1000)};
					}
					this._map.refreshTileCounter(building);
				}
			}
		}
	};
	Lang.augmentProto(MapPlanet, Util.EventProvider);
	
	Lacuna.MapPlanet = new MapPlanet();
})();
YAHOO.register("mapPlanet", YAHOO.lacuna.MapPlanet, {version: "1", build: "0"}); 

}