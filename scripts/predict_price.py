#!/usr/bin/env python3
"""
E-Waste Price Prediction Script

This script takes a category, weight, and model path as arguments,
runs a regression model to predict the price of e-waste, and returns JSON results.

Usage:
    python predict_price.py <category> <weight> <model_path>
"""

import sys
import json
import os
import torch
import numpy as np

def load_model(model_path):
    """
    Load the price prediction model.
    
    In a real implementation, this would use PyTorch or similar:
    model = torch.load(model_path)
    """
    print(f"Loading model from: {model_path}", file=sys.stderr)
    # This is a placeholder for actual model loading
    return {"model_path": model_path}

def predict_price(category, weight, model):
    """
    Use the model to predict the price based on category and weight.
    
    In a real implementation:
    input_tensor = preprocess(category, weight)
    prediction = model(input_tensor)
    """
    print(f"Predicting price for {category} weighing {weight}kg", file=sys.stderr)
    
    # This is a placeholder for actual prediction
    # In a real implementation, we would use the actual model
    
    # Mock price calculation based on category and weight
    base_prices = {
        "LAPTOP": 20.0,
        "PHONE": 10.0,
        "TABLET": 15.0,
        "MONITOR": 25.0,
        "DESKTOP": 30.0,
        "KEYBOARD": 5.0,
        "MOUSE": 2.0,
        "PRINTER": 15.0,
        "SPEAKER": 7.0,
        "OTHER": 5.0
    }
    
    # Get base price for the category, default to OTHER
    base_price = base_prices.get(category.upper(), base_prices["OTHER"])
    
    # Calculate price based on weight
    weight_factor = float(weight) * 1.5
    
    # Add a "market adjustment" factor
    market_adjustment = base_price * 0.2
    
    # Calculate total price
    total_price = base_price + weight_factor + market_adjustment
    
    # Round to 2 decimal places
    total_price = round(total_price, 2)
    
    result = {
        "estimatedPrice": total_price,
        "breakdown": {
            "basePrice": base_price,
            "weightFactor": weight_factor,
            "marketAdjustment": market_adjustment
        }
    }
    
    return result

def main():
    """
    Main entry point of the script.
    """
    if len(sys.argv) != 4:
        print("Usage: python predict_price.py <category> <weight> <model_path>", file=sys.stderr)
        sys.exit(1)
    
    category = sys.argv[1].upper()
    weight = sys.argv[2]
    model_path = sys.argv[3]
    
    try:
        # Validate inputs
        try:
            weight_float = float(weight)
            if weight_float <= 0:
                raise ValueError("Weight must be positive")
        except ValueError:
            print(f"Error: Invalid weight value: {weight}", file=sys.stderr)
            sys.exit(1)
        
        # Check if model exists
        if not os.path.exists(model_path):
            print(f"Error: Model not found at {model_path}", file=sys.stderr)
            sys.exit(1)
        
        # Load the model
        model = load_model(model_path)
        
        # Run prediction
        result = predict_price(category, weight_float, model)
        
        # Output the result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 