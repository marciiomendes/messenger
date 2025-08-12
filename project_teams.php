<?php
include('../../../inc/includes.php');

Session::checkLoginUser();

$projectId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($projectId <= 0) {
    Html::displayErrorAndDie(__('Invalid project ID', 'projectpro'));
}

// Carregar jQuery e Select2 via CDN
echo '<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" type="text/css" />'; 
echo '<script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>';
echo '<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>';

echo '<style>
    .team-section { margin: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .team-section h3 { margin-top: 0; color: #333; font-size: 1.5em; }
    .add-team-btn { padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; transition: background 0.3s; }
    .add-team-btn:hover { background: #0056b3; }
    .team-entry { margin-top: 12px; display: flex; align-items: center; gap: 10px; }
    .group-select { width: 300px; }
    .remove-team-btn { padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; transition: background 0.3s; }
    .remove-team-btn:hover { background: #b02a37; }
    .select2-container { z-index: 10000; }
    .select2-search__field { width: 100% !important; padding: 4px; border-radius: 4px; }
    .select2-dropdown { z-index: 10001; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .loading-spinner { display: none; }
    .error-message { color: #dc3545; margin-top: 8px; }
    @media (max-width: 600px) {
        .team-entry { flex-direction: column; align-items: flex-start; }
        .group-select { width: 100%; }
        .remove-team-btn { margin-left: 0; margin-top: 8px; }
    }
</style>';

echo '<div class="team-section">';
echo '<h3>' . __('Project Teams', 'projectpro') . '</h3>';
echo '<button class="add-team-btn" title="' . addslashes(__('Add a team to the project', 'projectpro')) . '">' . __('Add Team', 'projectpro') . '</button>';
echo '<div id="team-list"></div>';
echo '</div>';

echo '<script>
(function($) {
    $(document).ready(function() {
        console.log("jQuery loaded:", typeof $ !== "undefined");
        console.log("Select2 loaded:", typeof $.fn.select2 !== "undefined");
        console.log("Session glpiID:", ' . (isset($_SESSION['glpiID']) ? $_SESSION['glpiID'] : '"undefined"') . ');');
        console.log("Project ID:", ' . $projectId . ');

        var teamCounter = 0;
        var isLoading = false;

        function showError(message) {
            $(".error-message").remove();
            $(".team-section").append(`<div class="error-message">${message}</div>`);
        }

        function showLoading() {
            if (!isLoading) {
                isLoading = true;
                $(".team-section").append(`<div class="loading-spinner">Loading...</div>`);
            }
        }

        function hideLoading() {
            isLoading = false;
            $(".loading-spinner").remove();
        }

        $(".add-team-btn").on("click", function() {
            if (isLoading) return;
            
            showLoading();
            
            var teamHtml = `
                <div class="team-entry" data-id="${teamCounter}">
                    <select class="group-select" name="group_${teamCounter}" title="' . addslashes(__('Select a group for the team', 'projectpro')) . '"></select>
                    <button class="remove-team-btn" title="' . addslashes(__('Remove this team', 'projectpro')) . '">' . addslashes(__('Remove', 'projectpro')) . '</button>
                </div>`;
            $("#team-list").append(teamHtml);

            var $select = $(`.team-entry[data-id="${teamCounter}"] .group-select`);
            $select.select2({
                placeholder: "' . addslashes(__('Select a group', 'projectpro')) . '",
                allowClear: true,
                minimumResultsForSearch: 0,
                searchInputPlaceholder: "' . addslashes(__('Search groups...', 'projectpro')) . '",
                width: "100%",
                language: {
                    noResults: function() { return "' . addslashes(__('No groups found', 'projectpro')) . '"; },
                    searching: function() { return "' . addslashes(__('Searching...', 'projectpro')) . '"; }
                }
            });

            $.ajax({
                url: "ajax/get_groups.php",
                method: "GET",
                dataType: "json",
                headers: { "Accept": "application/json" },
                error: function(xhr, status, error) {
                    hideLoading();
                    showError("' . addslashes(__('Error loading groups. Please try again.', 'projectpro')) . '");
                    console.error("AJAX Error:", error);
                }
            }).done(function(data) {
                hideLoading();
                if (!data || !data.groups || !Array.isArray(data.groups)) {
                    showError("' . addslashes(__('No groups available', 'projectpro')) . '");
                    return;
                }

                var groups = data.groups;
                $select.empty();
                $select.append(`<option value="">' . addslashes(__('Select a group', 'projectpro')) . '</option>`);
                
                groups.forEach(function(group) {
                    $select.append(`<option value="${group.value}">${group.label}</option>`);
                });

                if (groups.length === 0) {
                    showError("' . addslashes(__('No groups found', 'projectpro')) . '");
                }
            }).fail(function(jqXHR, textStatus) {
                hideLoading();
                showError("' . addslashes(__('Failed to load groups. Please try again.', 'projectpro')) . '");
                console.error("Error fetching groups:", textStatus, jqXHR.status);
                $select.append(`<option value="">' . addslashes(__('Error loading groups', 'projectpro')) . '</option>`);
            });

            teamCounter++;
        });

        $(document).on("click", ".remove-team-btn", function() {
            if (isLoading) return;
            
            $(this).closest(".team-entry").remove();
            
            // Re-index team entries
            $(".team-entry").each(function(index) {
                $(this).attr("data-id", index);
                $(this).find(".group-select").attr("name", `group_${index}`);
            });
        });
    });
})(jQuery.noConflict(true));
</script>';

Html::footer();
