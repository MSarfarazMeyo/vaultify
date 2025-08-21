import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";

const FeaturesPreview = ({ plan }: { plan: any }) => {
    const [expanded, setExpanded] = useState(false);

    const featuresToShow = expanded ? plan.features : plan.features.slice(0, 3);

    return (
        <View style={styles.featuresPreview}>
            {featuresToShow.map((feature: any, index: number) => (
                <View key={index} style={styles.featurePreviewItem}>
                    <Check size={14} color={plan.color} />
                    <Text style={styles.featurePreviewText}>{feature}</Text>
                </View>
            ))}

            {plan.features.length > 3 && (
                <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                    <Text style={[styles.moreFeatures, { color: plan.color }]}>
                        {expanded
                            ? "Show less"
                            : `+${plan.features.length - 3} more features`}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    featuresPreview: {
        marginBottom: 20,
    },
    featurePreviewItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    featurePreviewText: {
        fontSize: 14,
        fontFamily: "Inter-Regular",
        color: "#FFFFFF",
        marginLeft: 10,
        flex: 1,
    },
    moreFeatures: {
        fontSize: 12,
        fontFamily: "Inter-SemiBold",
        marginTop: 4,
        marginLeft: 24,
    },
});

export default FeaturesPreview;
