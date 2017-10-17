/// <reference path="../request.js" />

window.CrmSdk = window.CrmSdk || {};
CrmSdk.Common = CrmSdk.Common || {};

/**
 * @function getEntitySetName
 * @description Queries the CRM Web API for the EntitySet name of the given entity.
 * @parameter {string} entityLogicalName - Logical name of the entity for which to retrieve the EntitySet name.
 */
CrmSdk.Common.getEntitySetName = function (entityLogicalName) {
    return CrmSdk.request(
        "GET",
        ["/EntityDefinitions?",
            "$filter=",
                "LogicalName eq '", entityLogicalName, "'",
            "&$select=EntitySetName"].join(""))
        .then(function (request) {
            var result = JSON.parse(request.response);
            if (result.value.length == 0) {
                throw new Error("CrmSdk.Common.getEntitySetName: Could not find entity with logical name: '" + entityLogicalName + "'.");
            }
            return result.value[0].EntitySetName;
        });
};