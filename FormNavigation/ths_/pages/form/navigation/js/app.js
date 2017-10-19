/// <reference path="/ths_/libraries/common/web/get_query_parameters.js" />
/// <reference path="/ths_/libraries/crm_sdk/retrieve_version.js" />
/// <reference path="/ths_/libraries/crm_sdk/request.js" />

window.formNavigation = (function () {
    var linkControls = [];
    var linkControlMap = {};

    function onLoad() {
        var configuration = getConfiguration();
        CrmSdk.retrieveVersion()
            .then(function () {
                return createLinks(configuration);
            }).then(function () {
                refreshLinks();
            });
    }

    function getConfiguration() {
        var parameters = Common.Web.getQueryParameters();
        var configuration;
        if (!parameters.data) {
            return null;
        } else {
            configuration = JSON.parse(parameters.data);
        }
        applyDefaultConfiguration(configuration);
        return configuration;
    }

    function applyDefaultConfiguration(configuration) {
        if(configuration.showAllLinks === undefined) {
            configuration.showAllLinks = true;
        }
        if (configuration.links === undefined) {
            configuration.links = [];
        }
    }
    
    function createLinks(configuration) {
        return createLinkControls(configuration).then(function () {
            populateListElement();
            return Promise.resolve();
        });
    }

    function createLinkControls(configuration) {
        for (var i = 0; i < configuration.links.length; i++) {
            var linkConfig = configuration.links[i];
            createLinkControlFromLinkConfig(linkConfig);
        }
        var promise;
        if (configuration.showAllLinks) {
            promise = CrmSdk.request("GET", ["/RelationshipDefinitions/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata?$filter=ReferencedEntity eq '", window.parent.Xrm.Page.data.entity.getEntityName(), "'&$select=SchemaName,ReferencingEntity,ReferencingAttribute"].join("")).then(
	            function (relationshipRequest) {
	                var relationships = JSON.parse(relationshipRequest.responseText).value;

	                var countConfigurations = [];

	                relationships.forEach(function (relationship) {
	                    var navItemId = ["nav_", relationship.SchemaName].join("");
	                    if (window.parent.Xrm.Page.ui.navigation.items.get(navItemId) !== null
                            && !linkControlMap[navItemId]) {
	                        countConfigurations.push({
	                            navigationItemId: navItemId,
	                            setupProperties: {
	                                referencingEntity: relationship.ReferencingEntity,
	                                referencingAttribute: relationship.ReferencingAttribute
	                            }
	                        });
	                    }
	                });

	                return countConfigurations;
	            }).then(
	            function (countConfigurations) {
	                var entityQueryParts = ["/EntityDefinitions?$select=LogicalName,PrimaryIdAttribute,EntitySetName&$filter="];
	                var viewQueryParts = ["/savedqueries?$select=returnedtypecode,fetchxml&$filter=querytype eq 2 and isdefault eq true and ("];

	                var entityQueryConditions = [];
	                var viewQueryConditions = [];
	                countConfigurations.forEach(function (configuration) {
	                    entityQueryConditions.push(["LogicalName eq '", configuration.setupProperties.referencingEntity, "'"].join(""));
	                    viewQueryConditions.push(["returnedtypecode eq '", configuration.setupProperties.referencingEntity, "'"].join(""));
	                });

	                entityQueryParts.push(entityQueryConditions.join(" or "));
	                viewQueryParts.push(viewQueryConditions.join(" or "));
	                viewQueryParts.push(")");

	                var entityQuery = entityQueryParts.join("");
	                var viewQuery = viewQueryParts.join("");

	                return Promise.all([
			            countConfigurations,
			            CrmSdk.request("GET", entityQuery).then(function (request) {
			                return JSON.parse(request.response).value;
			            }),
			            CrmSdk.request("GET", viewQuery).then(function (request) {
			                return JSON.parse(request.response).value;
			            }),
	                ]);
	            }).then(function (results) {
	                var countConfigurations = results[0];
	                var entities = results[1];
	                var views = results[2];

	                var configurationMap = {};

	                countConfigurations.forEach(function (configuration) {
	                    configurationMap[configuration.setupProperties.referencingEntity] = configuration;
	                });

	                entities.forEach(function (entity) {
	                    var configuration = configurationMap[entity.LogicalName];
	                    configuration.entitySetName = entity.EntitySetName;
	                    configuration.setupProperties.primaryIdAttribute = entity.PrimaryIdAttribute;
	                });

	                views.forEach(function (view) {
	                    var configuration = configurationMap[view.returnedtypecode];
	                    configuration.setupProperties.originalFetchXml = view.fetchxml;
	                });

	                return countConfigurations;
	            }).then(function (countConfigurations) {
	                countConfigurations.forEach(function (configuration) {
	                    if ("ActiveXObject" in window)
	                    {
	                        var xmlDocument = new ActiveXObject("Microsoft.XMLDOM");
	                        xmlDocument.loadXML(configuration.setupProperties.originalFetchXml);

	                        var entityNode = xmlDocument.selectSingleNode("/fetch/entity");

	                        var currentFilter = entityNode.selectSingleNode("filter");
	                        var newFilter;
	                        var attribute;
	                        if (    currentFilter == null
                                ||  (   (attribute = currentFilter.attributes.getNamedItem("type"))
                                    &&  attribute.value === "or")) {
	                            newFilter = xmlDocument.createElement("filter");
	                            attribute = xmlDocument.createAttribute("type");
	                            attribute.value = "and";
	                            newFilter.attributes.setNamedItem(attribute);
	                            if (currentFilter != null) {
	                                newFilter.appendChild(currentFilter);
	                            }
	                            entityNode.appendChild(newFilter);
	                        } else {
	                            newFilter = currentFilter;
	                        }

	                        var conditionNode = xmlDocument.createElement("condition");

	                        attribute = xmlDocument.createAttribute("attribute");
	                        attribute.value = configuration.setupProperties.referencingAttribute;
	                        conditionNode.attributes.setNamedItem(attribute);

	                        attribute = xmlDocument.createAttribute("operator");
	                        attribute.value = "eq";
	                        conditionNode.attributes.setNamedItem(attribute);

	                        attribute = xmlDocument.createAttribute("value");
	                        attribute.value = window.parent.Xrm.Page.data.entity.getId();
	                        conditionNode.attributes.setNamedItem(attribute);

	                        newFilter.appendChild(conditionNode);

	                        var unnecessaryNodes = entityNode.selectNodes("attribute|order");
	                        for (var i = 0; i < unnecessaryNodes.length; i++) {
	                            var unnecessaryNode = unnecessaryNodes[i];
	                            entityNode.removeChild(unnecessaryNode);
	                        }

	                        var primaryAttributeNode = xmlDocument.createElement("attribute");

	                        attribute = xmlDocument.createAttribute("name");
	                        attribute.value = configuration.setupProperties.primaryIdAttribute;
	                        primaryAttributeNode.attributes.setNamedItem(attribute);

	                        entityNode.appendChild(primaryAttributeNode);

	                        configuration.fetchXml = xmlDocument.xml;
	                    } else {
	                        var xmlDocument = new DOMParser().parseFromString(configuration.setupProperties.originalFetchXml, "text/xml");

	                        var entityNode = xmlDocument.evaluate("/fetch/entity", xmlDocument, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;

	                        var filterResult = xmlDocument.evaluate("/fetch/entity/filter", xmlDocument, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
	                        var currentFilter = filterResult.singleNodeValue;
	                        var newFilter;
	                        if (currentFilter == null || currentFilter.getAttribute("type") == "or") {
	                            newFilter = xmlDocument.createElement("filter");
	                            newFilter.setAttribute("type", "and");
	                            if (currentFilter != null) {
	                                newFilter.appendChild(currentFilter);
	                            }
	                            entityNode.appendChild(newFilter);
	                        } else {
	                            newFilter = currentFilter;
	                        }
	                        var conditionNode = xmlDocument.createElement("condition");
	                        conditionNode.setAttribute("attribute", configuration.setupProperties.referencingAttribute);
	                        conditionNode.setAttribute("operator", "eq");
	                        conditionNode.setAttribute("value", window.parent.Xrm.Page.data.entity.getId());
	                        newFilter.appendChild(conditionNode);

	                        var unnecessaryNodes = xmlDocument.evaluate("/fetch/entity/attribute|/fetch/entity/order", xmlDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
	                        for (var i = 0; i < unnecessaryNodes.snapshotLength; i++) {
	                            var unnecessaryNode = unnecessaryNodes.snapshotItem(i);
	                            unnecessaryNode.remove();
	                        }

	                        var primaryAttributeNode = xmlDocument.createElement("attribute");
	                        primaryAttributeNode.setAttribute("name", configuration.setupProperties.primaryIdAttribute);
	                        entityNode.appendChild(primaryAttributeNode);

	                        configuration.fetchXml = xmlDocument.firstChild.outerHTML;
	                    }
	                    
	                    /// TODO: Get the Icon Path
	                    configuration.iconPath = "test.png";
	                    delete configuration.setupProperties;
	                });
	                console.warn("TODO: Get the Icon Path");
	                return countConfigurations;
	            }).then(function (countConfigurations) {
	                countConfigurations.forEach(function(configuration) {
	                    configuration.label = window.parent.Xrm.Page.ui.navigation.items.get(configuration.navigationItemId).getLabel();
	                    linkControlMap[configuration.navigationItemId] = configuration;
	                });
	            });
        } else {
            promise = Promise.resolve();
        }
        return promise.then(function () {
            window.parent.Xrm.Page.ui.navigation.items.forEach(function (navItem) {
                var linkControl = linkControlMap[navItem.getId()];
                if(!linkControl)
                {
                    return;
                }
                linkControl.linkIndex = linkControls.length;
                linkControls.push(linkControl);
            });
            return Promise.resolve();
        });
    }

    function createLinkControlFromLinkConfig(linkConfig) {
        var entityId = window.parent.Xrm.Page.data.entity.getId();
        var linkControl = {
            navigationItemId: linkConfig.navigationItemId,
            fetchXml: decodeURIComponent(linkConfig.fetchXml).replace("{id}", entityId),
            entitySetName: linkConfig.entitySetName,
            iconPath: linkConfig.iconPath
        };
        if (linkConfig.label) {
            linkControl.label = linkConfig.label;
        } else {
            linkControl.label = window.parent.Xrm.Page.ui.navigation.items.get(linkControl.navigationItemId).getLabel();
        }
        linkControlMap[linkConfig.navigationItemId] = linkControl;
    }

    function populateListElement() {
        var listElement = document.getElementById("navigationList");
        for (var i = 0; i < linkControls.length; i++) {
            var linkControl = linkControls[i];
            var listItemElement = createListItemElement(linkControl);
            listElement.appendChild(listItemElement);
        }
    }

    function createListItemElement(linkControl) {
        var listItemElement = document.createElement("LI");
        listItemElement.id = linkControl.navigationItemId;

        var linkElement = document.createElement("A");
        linkElement.href = "javascript:formNavigation.navigateTo(" + linkControl.linkIndex + ");";

        var labelElement = document.createElement("SPAN");
        labelElement.className = "label";
        labelElement.innerText = linkControl.label;
        linkElement.appendChild(labelElement);


        var countElement = document.createElement("SPAN");
        countElement.className = "count";
        countElement.id = [linkControl.navigationItemId, ".count"].join("");
        linkElement.appendChild(countElement);

        listItemElement.appendChild(linkElement);
        return listItemElement;
    }

    function navigateTo(linkIndex) {
        var linkControl = linkControls[linkIndex];
        window.parent.Xrm.Page.ui.navigation.items.get(linkControl.navigationItemId).setFocus();
    }

    function refreshLinks() {
        return Promise.all(
            linkControls.map(
                function (linkControl) {
                    return CrmSdk.request(
                        "GET",
                        ["/", linkControl.entitySetName, "?fetchXml=", linkControl.fetchXml].join("")
                        ).then(function (request) {
                            var result = JSON.parse(request.response);
                            return result.value.length;
                        });
                })
            ).then(function (counts) {
                for (var i = 0; i < counts.length; i++)
                {
                    var linkControl = linkControls[i];
                    var countElement = document.getElementById([linkControl.navigationItemId, ".count"].join(""));
                    var countString = [" (", counts[i], ")"].join("");
                    countElement.innerText = countString;
                    var fullLabel = [linkControl.label, countString].join("");
                    window.parent.Xrm.Page.ui.navigation.items.get(linkControl.navigationItemId).setLabel(fullLabel);
                }
                window.setTimeout(refreshLinks, 1000);
            });
    }
    
    return {
        onLoad: onLoad,
        refreshLinks: refreshLinks,
        navigateTo: navigateTo
    };
}());