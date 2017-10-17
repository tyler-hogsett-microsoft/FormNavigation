/// <reference path="../../crm_sdk/get_entity_set_name.js" />

function countAssociatedEntities() {

}

/*

Note: This feature is in progress. The idea is to read the metadata of the current form and render the navigation items automatically without any additional configuration.

It will likely include something like the below:

CrmSdk.request("GET", ["/systemforms(", Xrm.Page.ui.formSelector.getCurrentItem().getId(), ")?$select=formxml"].join("")).then(
	function(formRequest) {
		var formObject = JSON.parse(formRequest.responseText);
		var xmlDocument = new DOMParser().parseFromString(formObject.formxml, "text/xml");
		debugger;
		var relationshipItems = xmlDocument.evaluate("/form/Navigation/NavBar/NavBarByRelationshipItem");
		var navItems = [];
		for(var i = 0; i < relationshipItems.length; i++) {
			navItems.push({
				relationshipName: relationshipItems[i].attributes.getNamedItem("RelationshipName").value
            });
        }
		return navItems;
    }).then(
	function(navItems) {
		return Promise.all(navItems.map(function(navItem) {
			return CrmSdk.request("GET", ["/RelationshipDefinitions?$filter=SchemaName eq '", navItem.relationshipName, "'"].join("")).then(
				function(request) {
					var relationship = JSON.parse(request.responseText).value[0];
					if(!relationship) {
						console.warn(["Relationship does not exist for: ", navItem.relationshipName].join(""));
						return Promise.resolve();
                    }
					if(!relationship.ReferencingEntity) {
						console.warn(["No referencing entity for: ", relationship.SchemaName].join(""));
						return Promise.resolve();
                    }
					return Promise.all([
						CrmSdk.Common.getEntitySetName(relationship.ReferencingEntity),
						CrmSdk.request("GET", ["/savedqueries?$filter=returnedtypecode eq '", relationship.ReferencingEntity, "' and querytype eq 2 and isdefault eq true&$select=fetchxml"].join(""))]).then(
						function(results) {
							var entitySetName = results[0];
							var fetchXmlMetadataResponse = JSON.parse(results[1].response);
							var fetchXml = fetchXmlMetadataResponse.value[0].fetchxml;
							var document = new DOMParser().parseFromString(fetchXml, "text/xml");
							var entityNode = document.evaluate("/fetch/entity", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
							var filterResult = document.evaluate("/fetch/entity/filter", document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
							var currentFilter = filterResult.singleNodeValue;
							var newFilter;
							if(currentFilter == null || currentFilter.getAttribute("type") == "or") {
								newFilter = document.createElement("filter");
								newFilter.setAttribute("type", "and");
								if(currentFilter != null) {
									newFilter.appendChild(currentFilter);
                                }
								entityNode.appendChild(newFilter);
                            } else {
								newFilter = currentFilter;
                            }
							var conditionNode = document.createElement("condition");
							conditionNode.setAttribute("attribute", relationship.ReferencingAttribute);
							conditionNode.setAttribute("operator", "eq");
							conditionNode.setAttribute("value", Xrm.Page.data.entity.getId());
							newFilter.appendChild(conditionNode);
							return CrmSdk.request("GET", ["/", entitySetName, "?fetchXml=", document.firstChild.outerHTML].join("")).then(
								function(request) {
									return JSON.parse(request.response).value.length;
                                });
                        });
                });
        })).then(
		function(resultSets) {
			console.log(resultSets);
        });
    });

*/