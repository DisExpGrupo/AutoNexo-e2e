Feature: Car owner accepts offer

  Scenario: Car owner accepts workshop offer
    Given I am logged in as a car owner
    When I open "My Service Requests"
    And I view the latest pending request
    And I accept the offer
    Then I see the booking receipt
