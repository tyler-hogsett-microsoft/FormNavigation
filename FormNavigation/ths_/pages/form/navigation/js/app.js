/// <reference path="/ths_/libraries/common/web/get_query_parameters.js" />
/// <reference path="/ths_/libraries/crm_sdk/retrieve_version.js" />
/// <reference path="/ths_/libraries/crm_sdk/request.js" />

window.formNavigation = (function () {
    var linkControls = [];

    function onLoad() {
        var configuration = getConfiguration();
        createLinks(configuration);
        CrmSdk.retrieveVersion().then(function () {
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
        ///TODO: Add "showAllLinks" functionality
        /*
        if(configuration.showAllLinks === undefined) {
            configuration.showAllLinks = true;
        }
        */
        if (configuration.links === undefined) {
            configuration.links = [];
        }
    }
    
    function createLinks(configuration) {
        createLinkControls(configuration);
        populateListElement();
    }

    function createLinkControls(configuration) {
        ///TODO: Add "showAllLinks" functionality
        /*
        if (configuration.showAllLinks) {
            var configLinksAsDictionary = {};
            for (var i = 0; i < configuration.links.length; i++) {
                var link = configuration.links[i];
                configLinksAsDictionary[link.navigationItemId] = link;
            }
            window.parent.Xrm.Page.ui.navigation.items.forEach(function (navigationItem) {
                var linkControl;
                var linkConfig = configLinksAsDictionary[navigationItem.getId()];
                if (linkConfig !== undefined) {
                    linkControl = createLinkControlFromLinkConfig(linkConfig);
                } else {
                    linkControl = createLinkControlFromNavigationItem(navigationItem);
                }
                linkControls.push(linkControl);
            });
        } 
        */
        for (var i = 0; i < configuration.links.length; i++) {
            var linkConfig = configuration.links[i];
            createLinkControlFromLinkConfig(linkConfig);
        }
    }

    /// TODO: Add functionality to create link from navigation item
    /*
    function createLinkControlFromNavigationItem(navigationItem) {
        return {
            navigationItemId: navigationItem.getId(),
            label: navigationItem.getLabel(),
            linkIndex: linkControls.length
        };
    }
    */

    function createLinkControlFromLinkConfig(linkConfig) {
        var entityId = window.parent.Xrm.Page.data.entity.getId();
        var linkControl = {
            navigationItemId: linkConfig.navigationItemId,
            fetchXml: decodeURIComponent(linkConfig.fetchXml).replace("{id}", entityId),
            entitySetName: linkConfig.entitySetName,
            iconPath: linkConfig.iconPath,
            linkIndex: linkControls.length
        };
        if (linkConfig.label) {
            linkControl.label = linkConfig.label;
        } else {
            linkControl.label = window.parent.Xrm.Page.ui.navigation.items.get(linkControl.navigationItemId).getLabel();
        }
        linkControls.push(linkControl);
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
        Promise.all(
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