Feature: Car owner creates service request

  Scenario: Car owner registers vehicle and creates a service request
    Given I am logged in as a car owner
    When I register a new vehicle
    And I create a service request with service "BRAKE_PAD_REPLACEMENT" at the workshop coordinates
    Then I see the request in "My Service Requests"
